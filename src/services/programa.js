import * as repositorio from '../repositories/programaRepository.js'
import {
  MINUTOS_POR_TRABAJO,
  capacidadSesion,
  conflictosDeSesion,
  detectarConflictos,
  hayCambiosSinPublicar,
  horarioTrabajo,
  recortarHora,
} from './calculosPrograma.js'
import { ErrorUsuario } from './validacionesUsuario.js'
import {
  validarCodigosTrabajos,
  validarDatosSesion,
  validarEdicionOpcional,
  validarIdSesion,
} from './validacionesPrograma.js'

const presentarEdicion = edicion => ({
  id: edicion.id,
  nombre: edicion.name,
  anio: edicion.year,
  sede: edicion.venue,
})

// Si el trabajo aún no tiene la lista de autores, se muestra quien lo registró.
const nombresAutores = trabajo =>
  trabajo.authors?.length
    ? trabajo.authors.map(autor => autor.name).join(', ')
    : (trabajo.owner?.fullName ?? '')

async function resolverEdicion(valor, transaction) {
  const edicion = await repositorio.obtenerEdicion(validarEdicionOpcional(valor), transaction)
  if (!edicion) throw new ErrorUsuario('La edición consultada no existe.', 404)
  return edicion
}

function presentarSesion(sesion) {
  const base = {
    id: sesion.id,
    nombre: sesion.name,
    ejeId: sesion.thematicAxisId,
    eje: sesion.EjeTematico?.name ?? null,
    fecha: sesion.date,
    horaInicio: recortarHora(sesion.startTime),
    horaFin: recortarHora(sesion.endTime),
    salaId: sesion.roomId,
    sala: sesion.Sala?.code ?? null,
    ubicacionSala: sesion.Sala?.location ?? null,
    moderadorId: sesion.moderatorId ?? null,
    moderador: sesion.moderator?.fullName ?? null,
    correoModerador: sesion.moderator?.email ?? null,
  }
  const trabajos = [...(sesion.works ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((asignacion, indice) => {
      const trabajo = asignacion.Trabajo
      return {
        codigo: trabajo.code,
        titulo: trabajo.title,
        eje: trabajo.thematicAxis?.name ?? null,
        tipoTrabajo: trabajo.workType?.name ?? null,
        autores: nombresAutores(trabajo),
        orden: indice + 1,
        ...horarioTrabajo(base, indice),
      }
    })
  return { ...base, capacidad: capacidadSesion(base), trabajos }
}

const sesionesPublicables = sesiones => sesiones.map(presentarSesion)

// Programa que ve el público: la última versión publicada, no el borrador.
export async function obtenerProgramaPublico(consulta = {}) {
  const edicion = await resolverEdicion(consulta.edicionId)
  const publicado = Boolean(edicion.programPublished && edicion.programSnapshot)
  return {
    edicion: presentarEdicion(edicion),
    publicado,
    publicadoEn: publicado ? edicion.programSnapshot.publicadoEn : null,
    sesiones: publicado ? edicion.programSnapshot.sesiones : [],
  }
}

// Borrador editable del comité con los datos auxiliares de los formularios.
export async function obtenerGestionPrograma(consulta = {}) {
  const edicion = await resolverEdicion(consulta.edicionId)
  const [sesiones, salas, ejes, moderadores, aceptados] = await Promise.all([
    repositorio.listarSesiones(edicion.id),
    repositorio.listarSalas(),
    repositorio.listarEjes(edicion.id),
    repositorio.listarModeradores(),
    repositorio.listarTrabajosAceptados(edicion.id),
  ])
  const presentadas = sesionesPublicables(sesiones)
  const publicado = Boolean(edicion.programPublished && edicion.programSnapshot)
  return {
    edicion: presentarEdicion(edicion),
    publicado,
    publicadoEn: publicado ? edicion.programSnapshot.publicadoEn : null,
    cambiosSinPublicar: publicado
      ? hayCambiosSinPublicar(edicion.programSnapshot.sesiones, presentadas)
      : presentadas.length > 0,
    minutosPorTrabajo: MINUTOS_POR_TRABAJO,
    sesiones: presentadas,
    conflictos: detectarConflictos(presentadas),
    salas: salas.map(sala => ({ id: sala.id, codigo: sala.code, ubicacion: sala.location })),
    ejes: ejes.map(eje => ({ id: eje.id, nombre: eje.name })),
    moderadores: moderadores.map(persona => ({
      id: persona.id,
      nombre: persona.fullName,
      correo: persona.email,
    })),
    trabajosAceptados: aceptados.map(trabajo => ({
      codigo: trabajo.code,
      titulo: trabajo.title,
      eje: trabajo.thematicAxis?.name ?? null,
      tipoTrabajo: trabajo.workType?.name ?? null,
      autores: nombresAutores(trabajo),
      sesionId: trabajo.programSlot?.sessionId ?? null,
      orden: trabajo.programSlot?.position ?? null,
    })),
  }
}

async function validarReferencias(datos, editionId, transaction) {
  const errores = {}
  const [sala, eje, moderador] = await Promise.all([
    repositorio.buscarSala(datos.roomId, transaction),
    repositorio.buscarEje(datos.thematicAxisId, editionId, transaction),
    repositorio.buscarModerador(datos.moderatorId, transaction),
  ])
  if (!sala) errores.salaId = 'La sala no existe.'
  if (!eje) errores.ejeId = 'El eje no pertenece a esta edición.'
  if (!moderador) errores.moderadorId = 'La persona moderadora no existe o su cuenta está bloqueada.'
  if (Object.keys(errores).length) throw new ErrorUsuario('Revise los datos de la sesión.', 400, errores)
  return { sala, eje, moderador }
}

// Rechaza guardar si la sesión choca con otra en la misma sala o con la misma moderación.
async function validarSolapamientos(id, datos, { sala, moderador }, editionId, transaction) {
  const otras = (await repositorio.listarSesiones(editionId, transaction))
    .filter(otra => otra.id !== id)
    .map(presentarSesion)
  const candidata = {
    id,
    nombre: datos.name,
    fecha: datos.date,
    horaInicio: datos.startTime,
    horaFin: datos.endTime,
    salaId: sala.id,
    sala: sala.code,
    moderadorId: moderador.id,
    moderador: moderador.fullName,
  }
  const [conflicto] = conflictosDeSesion([...otras, candidata], id)
  if (conflicto) {
    const texto = conflicto.tipo === 'sala' ? 'La sala' : 'La persona moderadora'
    throw new ErrorUsuario(`${texto} ya está ocupada en ese horario. ${conflicto.mensaje}`, 409, {
      [conflicto.tipo === 'sala' ? 'salaId' : 'moderadorId']: conflicto.mensaje,
    })
  }
}

export async function crearSesion(datos) {
  const cuerpo = validarDatosSesion(datos)
  const edicion = await resolverEdicion(datos?.edicionId)
  const id = await repositorio.ejecutarTransaccion(async transaction => {
    await repositorio.bloquearPrograma(edicion.id, transaction)
    const referencias = await validarReferencias(cuerpo, edicion.id, transaction)
    await validarSolapamientos(0, cuerpo, referencias, edicion.id, transaction)
    const sesion = await repositorio.crearSesion({ ...cuerpo, editionId: edicion.id }, transaction)
    return sesion.id
  })
  return presentarSesion(await repositorio.buscarSesion(id))
}

export async function actualizarSesion(idSesion, datos) {
  const id = validarIdSesion(idSesion)
  const cuerpo = validarDatosSesion(datos)
  await repositorio.ejecutarTransaccion(async transaction => {
    const actual = await repositorio.bloquearSesion(id, transaction)
    if (!actual) throw new ErrorUsuario('La sesión no existe.', 404)
    await repositorio.bloquearPrograma(actual.editionId, transaction)
    const referencias = await validarReferencias(cuerpo, actual.editionId, transaction)
    await validarSolapamientos(id, cuerpo, referencias, actual.editionId, transaction)

    // El nuevo horario debe seguir alojando los trabajos que ya tiene asignados.
    const asignados = await repositorio.contarTrabajosDeSesion(id, transaction)
    const capacidad = capacidadSesion({
      horaInicio: cuerpo.startTime,
      horaFin: cuerpo.endTime,
    })
    if (asignados > capacidad) {
      throw new ErrorUsuario(
        `La sesión tiene ${asignados} trabajos asignados y el nuevo horario solo admite ${capacidad}. Amplíe el horario o quite trabajos antes.`,
        409,
        { horaFin: `El horario admite hasta ${capacidad} trabajos de ${MINUTOS_POR_TRABAJO} minutos.` }
      )
    }
    await repositorio.guardarSesion(actual, cuerpo, transaction)
  })
  return presentarSesion(await repositorio.buscarSesion(id))
}

// Elimina solo la sesión: sus trabajos vuelven a quedar sin sesión, no se borran.
export async function eliminarSesion(idSesion) {
  const id = validarIdSesion(idSesion)
  return repositorio.ejecutarTransaccion(async transaction => {
    const sesion = await repositorio.bloquearSesion(id, transaction)
    if (!sesion) throw new ErrorUsuario('La sesión no existe.', 404)
    await repositorio.bloquearPrograma(sesion.editionId, transaction)
    const trabajosLiberados = await repositorio.contarTrabajosDeSesion(id, transaction)
    await repositorio.eliminarSesion(sesion, transaction)
    return { id, trabajosLiberados }
  })
}

// Reemplaza el contenido de la sesión: la lista recibida es el orden de exposición.
export async function asignarTrabajos(idSesion, datos) {
  const id = validarIdSesion(idSesion)
  const codigos = validarCodigosTrabajos(datos)
  await repositorio.ejecutarTransaccion(async transaction => {
    const sesion = await repositorio.bloquearSesion(id, transaction)
    if (!sesion) throw new ErrorUsuario('La sesión no existe.', 404)
    await repositorio.bloquearPrograma(sesion.editionId, transaction)

    const capacidad = capacidadSesion({
      horaInicio: recortarHora(sesion.startTime),
      horaFin: recortarHora(sesion.endTime),
    })
    if (codigos.length > capacidad) {
      throw new ErrorUsuario(`La sesión admite hasta ${capacidad} trabajos.`, 409)
    }

    const trabajos = await repositorio.buscarTrabajosPorCodigos(codigos, transaction)
    const porCodigo = new Map(trabajos.map(trabajo => [trabajo.code, trabajo]))
    const faltantes = codigos.filter(codigo => !porCodigo.has(codigo))
    if (faltantes.length) {
      throw new ErrorUsuario(`No existen los trabajos: ${faltantes.join(', ')}.`, 404)
    }
    const noAceptados = trabajos.filter(
      trabajo => trabajo.status !== 'accepted' || trabajo.editionId !== sesion.editionId
    )
    if (noAceptados.length) {
      throw new ErrorUsuario(
        `Solo se programan trabajos aceptados de esta edición: ${noAceptados.map(trabajo => trabajo.code).join(', ')}.`,
        409
      )
    }
    const enOtraSesion = trabajos.filter(
      trabajo => trabajo.programSlot && trabajo.programSlot.sessionId !== id
    )
    if (enOtraSesion.length) {
      throw new ErrorUsuario(
        `Ya están en otra sesión: ${enOtraSesion.map(trabajo => trabajo.code).join(', ')}. Quítelos de allí primero.`,
        409
      )
    }

    await repositorio.reemplazarTrabajos(
      id,
      codigos.map(codigo => porCodigo.get(codigo).id),
      transaction
    )
  })
  return presentarSesion(await repositorio.buscarSesion(id))
}

// Congela el borrador como versión pública; no se publica con solapamientos.
export async function publicarPrograma(datos = {}) {
  const edicion = await resolverEdicion(datos?.edicionId)
  return repositorio.ejecutarTransaccion(async transaction => {
    await repositorio.bloquearPrograma(edicion.id, transaction)
    const sesiones = sesionesPublicables(await repositorio.listarSesiones(edicion.id, transaction))
    if (!sesiones.length) {
      throw new ErrorUsuario('Cree al menos una sesión antes de publicar el programa.', 409)
    }
    const conflictos = detectarConflictos(sesiones)
    if (conflictos.length) {
      throw new ErrorUsuario(
        'No se puede publicar el programa mientras existan solapamientos.',
        409,
        { conflictos: conflictos.map(conflicto => conflicto.mensaje) }
      )
    }
    const publicadoEn = new Date().toISOString()
    await repositorio.guardarPublicacion(edicion, { publicadoEn, sesiones }, transaction)
    return { publicado: true, publicadoEn, sesiones: sesiones.length }
  })
}

// Exposiciones del autor según la versión publicada del programa.
export async function obtenerMiPresentacion(usuarioId, consulta = {}) {
  const edicion = await resolverEdicion(consulta.edicionId)
  const publicado = Boolean(edicion.programPublished && edicion.programSnapshot)
  if (!publicado) return { edicion: presentarEdicion(edicion), publicado: false, presentaciones: [] }

  const propios = await repositorio.listarCodigosDelAutor(usuarioId, edicion.id)
  const presentaciones = []
  for (const sesion of edicion.programSnapshot.sesiones) {
    for (const trabajo of sesion.trabajos) {
      if (!propios.has(trabajo.codigo)) continue
      const { trabajos, ...datosSesion } = sesion
      presentaciones.push({
        trabajo: { codigo: trabajo.codigo, titulo: trabajo.titulo },
        sesion: datosSesion,
        horario: { horaInicio: trabajo.horaInicio, horaFin: trabajo.horaFin },
        orden: trabajo.orden,
        totalTrabajos: trabajos.length,
      })
    }
  }
  return { edicion: presentarEdicion(edicion), publicado: true, presentaciones }
}
