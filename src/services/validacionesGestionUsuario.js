import { ErrorUsuario, limpiarTexto, validarObjeto } from './validacionesUsuario.js'

export const ROLES = ['author', 'reviewer', 'both', 'committee']
export const ESTADOS = ['activos', 'bloqueados']

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PATRON_FEMENINO = /^\s*(dra|sra|srta|lic\.? a)\b/i
const LIMITES = { nombres: 120, apellidos: 120, institucion: 200 }
const LIMITE_MOTIVO = 500

export function validarIdUsuario(id) {
  if (!PATRON_UUID.test(String(id ?? ''))) throw new ErrorUsuario('El ID del usuario no es válido.', 400)
  return String(id).toLowerCase()
}

export const inferirFemenino = nombres => PATRON_FEMENINO.test(nombres)

// Datos editables de un usuario (invitación y edición). Devuelve los campos con el nombre del modelo.
export function validarDatosUsuario(datos) {
  validarObjeto(datos)
  const errores = {}
  const limpio = {}

  for (const [campo, maximo] of Object.entries(LIMITES)) {
    limpio[campo] = limpiarTexto(datos[campo])
    if (!limpio[campo] || Array.from(limpio[campo]).length > maximo) {
      errores[campo] = `Este campo es obligatorio y admite hasta ${maximo} caracteres.`
    }
  }

  const correo = limpiarTexto(datos.correo).toLowerCase()
  if (!correo) errores.correo = 'Ingrese el correo electrónico.'
  else if (!PATRON_CORREO.test(correo) || correo.length > 254) errores.correo = 'Ingrese un correo válido.'

  if (!ROLES.includes(datos.rol)) errores.rol = 'Seleccione autor, revisor, ambos o comité.'
  if (datos.femenino !== undefined && typeof datos.femenino !== 'boolean') {
    errores.femenino = 'Indique verdadero o falso.'
  }

  if (Object.keys(errores).length) throw new ErrorUsuario('Revise los datos del usuario.', 400, errores)

  return {
    names: limpio.nombres,
    surnames: limpio.apellidos,
    email: correo,
    institution: limpio.institucion,
    role: datos.rol,
    // Si el comité no lo indica, se deduce del título («Dra.», «Sra.»…) como hacía el front.
    isFemale: datos.femenino ?? (inferirFemenino(limpio.nombres) || undefined),
  }
}

export function validarMotivoBloqueo(datos) {
  validarObjeto(datos)
  const motivo = limpiarTexto(datos.motivo)
  if (!motivo || Array.from(motivo).length > LIMITE_MOTIVO) {
    throw new ErrorUsuario('Ingrese el motivo del bloqueo.', 400, {
      motivo: `Este campo es obligatorio y admite hasta ${LIMITE_MOTIVO} caracteres.`,
    })
  }
  if (datos.notificar !== undefined && typeof datos.notificar !== 'boolean') {
    throw new ErrorUsuario('El campo «notificar» debe ser verdadero o falso.', 400)
  }
  return { motivo, notificar: datos.notificar === true }
}

export function validarFiltrosUsuarios(consulta = {}) {
  const texto = campo => (typeof consulta[campo] === 'string' ? consulta[campo].trim() : '')
  const filtros = {
    rol: texto('rol'),
    estado: texto('estado'),
    institucion: texto('institucion'),
    busqueda: texto('busqueda').slice(0, 100),
  }
  if (filtros.rol && !ROLES.includes(filtros.rol)) throw new ErrorUsuario('El rol indicado no es válido.', 400)
  if (filtros.estado && !ESTADOS.includes(filtros.estado)) throw new ErrorUsuario('El estado indicado no es válido.', 400)
  return filtros
}

export function validarEdicionId(valor) {
  if (valor === undefined || valor === '') return null
  if (!/^[1-9]\d{0,9}$/.test(String(valor)) || Number(valor) > 2147483647) {
    throw new ErrorUsuario('El ID de la edición no es válido.', 400)
  }
  return Number(valor)
}
