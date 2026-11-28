import { randomBytes } from 'node:crypto'
import { UniqueConstraintError, ValidationError } from 'sequelize'
import * as repositorio from '../repositories/gestionUsuariosRepository.js'
import { invalidarSesiones } from '../repositories/usuariosRepository.js'
import { contarActividad, resumirActividad } from './calculosMetricas.js'
import { enviarAvisoBloqueo, enviarInvitacion } from './correo.js'
import { generarHash } from './password.js'
import { ErrorUsuario } from './validacionesUsuario.js'
import {
  validarDatosUsuario,
  validarFiltrosUsuarios,
  validarIdUsuario,
  validarMotivoBloqueo,
} from './validacionesGestionUsuario.js'

const ACTIVIDAD_VACIA = { trabajos: 0, revisiones: 0, vencidas: 0 }

export const presentarUsuarioAdmin = (usuario, actividad = ACTIVIDAD_VACIA) => ({
  id: usuario.id,
  nombres: usuario.names,
  apellidos: usuario.surnames,
  nombre: usuario.fullName,
  correo: usuario.email,
  rol: usuario.role,
  femenino: usuario.isFemale,
  institucion: usuario.institution,
  bloqueado: usuario.blocked,
  motivoBloqueo: usuario.blockReason ?? '',
  ...actividad,
  actividad: resumirActividad(usuario.role, actividad),
})

function traducirErrorSequelize(error) {
  if (error instanceof UniqueConstraintError) {
    return new ErrorUsuario('Ya existe un usuario con este correo.', 409, {
      correo: 'Ya existe un usuario con este correo.',
    })
  }
  if (error instanceof ValidationError) {
    const errores = {}
    for (const campo of error.errors) errores[campo.path] = 'El valor no cumple el formato esperado.'
    return new ErrorUsuario('Revise los datos del usuario.', 400, errores)
  }
  return error
}

async function consultarActividad(usuarios) {
  const ids = usuarios.map(usuario => usuario.id)
  if (!ids.length) return []
  const [trabajos, asignaciones] = await Promise.all([
    repositorio.listarTrabajosPorAutor(ids),
    repositorio.listarAsignacionesPorRevisor(ids),
  ])
  return usuarios.map(usuario =>
    presentarUsuarioAdmin(usuario, contarActividad(usuario.id, trabajos, asignaciones))
  )
}

// GET /gestion_usuarios
export async function listarUsuarios(consulta) {
  const usuarios = await repositorio.listarUsuarios(validarFiltrosUsuarios(consulta))
  return consultarActividad(usuarios)
}

// POST /gestion_usuarios: crea la cuenta; la persona define su contraseña con «Olvidé mi contraseña».
export async function invitarUsuario(datos) {
  const cuenta = validarDatosUsuario(datos)
  const passwordHash = await generarHash(randomBytes(24).toString('base64'))
  let usuario
  try {
    usuario = await repositorio.ejecutarTransaccion(async transaction => {
      if (await repositorio.buscarUsuarioPorCorreo(cuenta.email, transaction)) {
        throw new ErrorUsuario('Ya existe un usuario con este correo.', 409, {
          correo: 'Ya existe un usuario con este correo.',
        })
      }
      return repositorio.crearUsuario({ ...cuenta, passwordHash, acceptedTerms: false })
    })
  } catch (error) {
    throw traducirErrorSequelize(error)
  }

  let correoEnviado = true
  try {
    await enviarInvitacion(usuario.email, usuario.fullName)
  } catch {
    correoEnviado = false
  }
  return { ...presentarUsuarioAdmin(usuario), correoEnviado }
}

// PUT /gestion_usuarios/:id
export async function actualizarUsuario(id, datos, comiteId) {
  const usuarioId = validarIdUsuario(id)
  const cuenta = validarDatosUsuario(datos)
  let usuario
  try {
    usuario = await repositorio.ejecutarTransaccion(async transaction => {
      const actual = await repositorio.buscarUsuarioParaActualizar(usuarioId, transaction)
      if (!actual) throw new ErrorUsuario('El usuario no existe.', 404)

      if (cuenta.email !== actual.email && await repositorio.buscarUsuarioPorCorreo(cuenta.email, transaction)) {
        throw new ErrorUsuario('Ya existe un usuario con este correo.', 409, {
          correo: 'Ya existe un usuario con este correo.',
        })
      }

      if (cuenta.role !== actual.role) {
        if (actual.id === comiteId) {
          throw new ErrorUsuario('No puede cambiar su propio rol.', 409, { rol: 'No puede cambiar su propio rol.' })
        }
        const dejaDeSerAutor = !['author', 'both'].includes(cuenta.role)
        if (dejaDeSerAutor && await repositorio.contarTrabajosDelAutor(actual.id, transaction)) {
          throw new ErrorUsuario('El usuario tiene trabajos registrados y debe seguir siendo autor.', 409, {
            rol: 'El usuario tiene trabajos registrados y debe seguir siendo autor.',
          })
        }
        const dejaDeSerRevisor = !['reviewer', 'both'].includes(cuenta.role)
        if (dejaDeSerRevisor && await repositorio.contarAsignacionesDelRevisor(actual.id, transaction)) {
          throw new ErrorUsuario('El usuario tiene revisiones asignadas. Reasígnelas antes de cambiar su rol.', 409, {
            rol: 'El usuario tiene revisiones asignadas. Reasígnelas antes de cambiar su rol.',
          })
        }
      }

      return repositorio.guardarUsuario(actual, cuenta, transaction)
    })
  } catch (error) {
    throw traducirErrorSequelize(error)
  }
  const [presentado] = await consultarActividad([usuario])
  return presentado
}

// PUT /gestion_usuarios/:id/bloqueo
export async function bloquearUsuario(id, datos, comiteId) {
  const usuarioId = validarIdUsuario(id)
  const { motivo, notificar } = validarMotivoBloqueo(datos)

  const { usuario, revisionesPausadas } = await repositorio.ejecutarTransaccion(async transaction => {
    const actual = await repositorio.buscarUsuarioParaActualizar(usuarioId, transaction)
    if (!actual) throw new ErrorUsuario('El usuario no existe.', 404)
    if (actual.id === comiteId) throw new ErrorUsuario('No puede bloquear su propia cuenta.', 409)
    if (actual.role === 'committee') throw new ErrorUsuario('No se puede bloquear a un miembro del comité.', 409)
    if (actual.blocked) throw new ErrorUsuario('El usuario ya está bloqueado.', 409)

    // Las revisiones pendientes se conservan en pausa: el seguimiento y los recordatorios
    // ignoran a los revisores bloqueados y vuelven a mostrarlas al reactivar la cuenta.
    // El comité puede reasignarlas desde el seguimiento si no desea esperar.
    const pendientes = await repositorio.listarAsignacionesPendientes(actual.id, transaction)

    await repositorio.guardarUsuario(actual, { blocked: true, blockReason: motivo }, transaction)
    await invalidarSesiones(actual.id, transaction)
    return { usuario: actual, revisionesPausadas: pendientes.length }
  })

  let notificado = false
  if (notificar) {
    try {
      await enviarAvisoBloqueo(usuario.email, usuario.fullName, motivo)
      notificado = true
    } catch {
      /* El bloqueo ya se aplicó; el aviso por correo es complementario. */
    }
  }
  const [presentado] = await consultarActividad([usuario])
  return { ...presentado, revisionesPausadas, notificado }
}

// DELETE /gestion_usuarios/:id/bloqueo
export async function reactivarUsuario(id) {
  const usuarioId = validarIdUsuario(id)
  const usuario = await repositorio.ejecutarTransaccion(async transaction => {
    const actual = await repositorio.buscarUsuarioParaActualizar(usuarioId, transaction)
    if (!actual) throw new ErrorUsuario('El usuario no existe.', 404)
    if (!actual.blocked) throw new ErrorUsuario('El usuario no está bloqueado.', 409)
    return repositorio.guardarUsuario(actual, { blocked: false, blockReason: null }, transaction)
  })
  const [presentado] = await consultarActividad([usuario])
  return presentado
}
