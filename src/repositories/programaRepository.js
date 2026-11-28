import { listarIdsTrabajosDelAutor } from './autoriaRepository.js'
import {
  sequelize,
  Edicion,
  EjeTematico,
  Sala,
  SesionPrograma,
  Trabajo,
  TrabajoSesion,
  Usuario,
} from '../models/index.js'

export const ejecutarTransaccion = operacion => sequelize.transaction(operacion)

// Serializa los cambios del programa de una edición para validar solapamientos sin carreras.
export const bloquearPrograma = (editionId, transaction) =>
  sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:clave))', {
    replacements: { clave: `programa:${editionId}` },
    transaction,
  })

export function obtenerEdicion(edicionId, transaction) {
  if (edicionId) return Edicion.findByPk(edicionId, { transaction })
  return Edicion.findOne({ order: [['year', 'DESC'], ['id', 'DESC']], transaction })
}

const incluirTrabajo = {
  model: Trabajo,
  include: [
    'workType',
    'thematicAxis',
    { association: 'owner', attributes: ['names', 'surnames'] },
    { association: 'authors', separate: true, order: [['position', 'ASC']] },
  ],
}

export const listarSesiones = (editionId, transaction) =>
  SesionPrograma.findAll({
    where: { editionId },
    include: [
      Sala,
      EjeTematico,
      { association: 'moderator', attributes: ['id', 'names', 'surnames', 'email', 'blocked'] },
      { association: 'works', include: [incluirTrabajo] },
    ],
    order: [['date', 'ASC'], ['startTime', 'ASC'], ['id', 'ASC']],
    transaction,
  })

export const buscarSesion = (id, transaction) =>
  SesionPrograma.findByPk(id, {
    include: [Sala, EjeTematico, { association: 'moderator' }, { association: 'works', include: [incluirTrabajo] }],
    transaction,
  })

export const bloquearSesion = (id, transaction) =>
  SesionPrograma.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })

export const listarSalas = () => Sala.findAll({ order: [['code', 'ASC']] })

export const buscarSala = (id, transaction) => Sala.findByPk(id, { transaction })

export const buscarEje = (id, editionId, transaction) =>
  EjeTematico.findOne({ where: { id, editionId }, transaction })

export const listarEjes = (editionId, transaction) =>
  EjeTematico.findAll({ where: { editionId }, order: [['name', 'ASC']], transaction })

export const buscarModerador = (id, transaction) =>
  Usuario.findOne({
    where: { id, blocked: false, role: ['committee', 'reviewer', 'both'] },
    transaction,
  })

export const listarModeradores = () =>
  Usuario.findAll({
    where: { blocked: false, role: ['committee', 'reviewer', 'both'] },
    attributes: ['id', 'names', 'surnames', 'email', 'role'],
    order: [['surnames', 'ASC'], ['names', 'ASC']],
  })

export const crearSesion = (datos, transaction) => SesionPrograma.create(datos, { transaction })

export const guardarSesion = (sesion, datos, transaction) => sesion.update(datos, { transaction })

export const eliminarSesion = (sesion, transaction) => sesion.destroy({ transaction })

export const contarTrabajosDeSesion = (sessionId, transaction) =>
  TrabajoSesion.count({ where: { sessionId }, transaction })

export const listarTrabajosAceptados = editionId =>
  Trabajo.findAll({
    where: { editionId, status: 'accepted' },
    include: [
      'workType',
      'thematicAxis',
      { association: 'owner', attributes: ['names', 'surnames'] },
      { association: 'authors', separate: true, order: [['position', 'ASC']] },
      { association: 'programSlot', attributes: ['sessionId', 'position'] },
    ],
    order: [['code', 'ASC']],
  })

export const buscarTrabajosPorCodigos = (codigos, transaction) =>
  Trabajo.findAll({
    where: { code: codigos },
    include: [{ association: 'programSlot', attributes: ['sessionId'] }],
    transaction,
  })

// Reemplaza el contenido de la sesión conservando el orden recibido.
export async function reemplazarTrabajos(sessionId, trabajoIds, transaction) {
  await TrabajoSesion.destroy({ where: { sessionId }, transaction })
  if (!trabajoIds.length) return
  await TrabajoSesion.bulkCreate(
    trabajoIds.map((workId, indice) => ({ sessionId, workId, position: indice + 1 })),
    { transaction }
  )
}

export const guardarPublicacion = (edicion, instantanea, transaction) =>
  edicion.update({ programPublished: true, programSnapshot: instantanea }, { transaction })

// Códigos de los trabajos de la edición donde la persona figura como autora o coautora.
export async function listarCodigosDelAutor(usuarioId, editionId) {
  const ids = await listarIdsTrabajosDelAutor(usuarioId)
  const trabajos = await Trabajo.findAll({
    where: { editionId, id: [...ids.todos] },
    attributes: ['code'],
  })
  return new Set(trabajos.map(trabajo => trabajo.code))
}
