import { Op } from 'sequelize'
import {
  sequelize,
  AsignacionRevision,
  Edicion,
  HistorialAsignacion,
  RecordatorioRevision,
  Revision,
  Trabajo,
  Usuario,
} from '../models/index.js'

const relacionesTrabajo = [
  'owner',
  'thematicAxis',
  'workType',
  'decision',
  { association: 'authors' },
  {
    association: 'assignments',
    include: ['reviewer', 'review'],
  },
]

function condicionIdentificadorTrabajo(identificador) {
  if (/^[1-9]\d{0,9}$/.test(String(identificador)) && Number(identificador) <= 2147483647) {
    return { id: Number(identificador) }
  }
  return { code: String(identificador).trim() }
}

export function ejecutarEnTransaccion(operacion) {
  return sequelize.transaction(operacion)
}

export function obtenerEdicionVigente(edicionId) {
  if (edicionId) {
    return Edicion.findByPk(edicionId)
  }
  return Edicion.findOne({ order: [['year', 'DESC'], ['id', 'DESC']] })
}

export function listarTrabajosConRelaciones({ edicionId } = {}) {
  return Trabajo.findAll({
    where: edicionId ? { editionId: edicionId } : undefined,
    order: [['code', 'ASC']],
    include: relacionesTrabajo,
  })
}

export async function obtenerTrabajoPorIdOCodigo(
  identificador,
  { transaction, bloquear = false } = {}
) {
  const where = condicionIdentificadorTrabajo(identificador)

  if (bloquear && transaction) {
    const base = await Trabajo.findOne({
      where,
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!base) return null
    return Trabajo.findByPk(base.id, {
      include: relacionesTrabajo,
      transaction,
    })
  }

  return Trabajo.findOne({
    where,
    include: relacionesTrabajo,
    transaction,
  })
}

export async function obtenerTrabajosPorIdentificadores(
  { ids = [], codigos = [] },
  { transaction, bloquear = false } = {}
) {
  const condiciones = []
  if (ids.length) condiciones.push({ id: { [Op.in]: ids } })
  if (codigos.length) condiciones.push({ code: { [Op.in]: codigos } })
  if (!condiciones.length) return []

  const where = condiciones.length === 1 ? condiciones[0] : { [Op.or]: condiciones }

  if (bloquear && transaction) {
    const bases = await Trabajo.findAll({
      where,
      attributes: ['id'],
      order: [['id', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!bases.length) return []
    return Trabajo.findAll({
      where: { id: { [Op.in]: bases.map(item => item.id) } },
      order: [['code', 'ASC']],
      include: relacionesTrabajo,
      transaction,
    })
  }

  return Trabajo.findAll({
    where,
    order: [['code', 'ASC']],
    include: relacionesTrabajo,
    transaction,
  })
}

export function listarRevisoresConRelaciones({ edicionId } = {}) {
  return Usuario.findAll({
    where: { role: { [Op.in]: ['reviewer', 'both'] } },
    order: [['surnames', 'ASC'], ['names', 'ASC']],
    include: [
      {
        association: 'interests',
        where: edicionId ? { editionId: edicionId } : undefined,
        required: false,
      },
      {
        association: 'reviewAssignments',
        required: false,
        include: [
          'review',
          {
            association: 'work',
            attributes: ['id', 'code', 'title', 'editionId', 'status'],
          },
        ],
      },
    ],
  })
}

export function obtenerUsuariosPorIds(ids, { transaction } = {}) {
  if (!ids.length) return Promise.resolve([])
  return Usuario.findAll({
    where: { id: { [Op.in]: ids } },
    include: ['interests'],
    transaction,
  })
}

export async function obtenerAsignacionPorId(
  id,
  { transaction, bloquear = false } = {}
) {
  if (bloquear && transaction) {
    const base = await AsignacionRevision.findByPk(id, {
      attributes: ['id', 'workId'],
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!base) return null
    await Trabajo.findByPk(base.workId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    // El envío de evaluaciones de la HU5 bloquea esta misma fila.
    await Revision.findOne({
      where: { assignmentId: base.id },
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
  }

  return AsignacionRevision.findByPk(id, {
    include: [
      'reviewer',
      'review',
      'reminders',
      {
        association: 'work',
        include: relacionesTrabajo,
      },
    ],
    transaction,
  })
}

export async function crearAsignacionConBorrador(
  { workId, reviewerId, dueDate, conflictJustification = null },
  transaction
) {
  const asignacion = await AsignacionRevision.create(
    {
      workId,
      reviewerId,
      dueDate,
      conflictJustification,
    },
    { transaction, validate: true }
  )

  const revision = await Revision.create(
    {
      assignmentId: asignacion.id,
      status: 'draft',
      authorComment: '',
      committeeComment: '',
    },
    { transaction, validate: true }
  )

  asignacion.review = revision
  return asignacion
}

export function eliminarAsignacion(asignacion, transaction) {
  return asignacion.destroy({ transaction })
}

export function contarAsignacionesTrabajo(workId, transaction) {
  return AsignacionRevision.count({ where: { workId }, transaction })
}

export function actualizarEstadoTrabajo(trabajo, nuevoEstado, transaction) {
  return trabajo.update({ status: nuevoEstado }, { transaction })
}

export function registrarHistorialAsignacion(
  {
    workId,
    action,
    reviewerId = null,
    previousReviewerId = null,
    performedById = null,
    reason = null,
    conflictJustification = null,
    dueDate,
  },
  transaction
) {
  return HistorialAsignacion.create(
    {
      workId,
      action,
      reviewerId,
      previousReviewerId,
      performedById,
      reason,
      conflictJustification,
      dueDate,
    },
    { transaction, validate: true }
  )
}

export function listarHistorialPorTrabajo(workId) {
  return HistorialAsignacion.findAll({
    where: { workId },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    include: ['reviewer', 'previousReviewer', 'performedBy'],
  })
}

export function listarAsignacionesSeguimiento({ edicionId } = {}) {
  return AsignacionRevision.findAll({
    order: [['dueDate', 'ASC'], ['id', 'ASC']],
    include: [
      'reviewer',
      'review',
      'reminders',
      {
        association: 'work',
        where: edicionId ? { editionId: edicionId } : undefined,
        required: true,
        include: ['thematicAxis', 'workType'],
      },
    ],
  })
}

export function crearRecordatorios(filas, transaction) {
  return RecordatorioRevision.bulkCreate(filas, {
    transaction,
    validate: true,
    returning: true,
  })
}
