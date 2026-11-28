import { Op, col, fn, where as condicion } from 'sequelize'
import { sequelize, AsignacionRevision, Trabajo, Usuario } from '../models/index.js'

export const ejecutarTransaccion = operacion => sequelize.transaction(operacion)

const escaparLike = texto => texto.replace(/[\\%_]/g, '\\$&')

export function listarUsuarios({ rol, estado, institucion, busqueda }) {
  const filtros = []
  if (rol) filtros.push({ role: rol })
  if (estado) filtros.push({ blocked: estado === 'bloqueados' })
  if (institucion) filtros.push({ institution: institucion })
  if (busqueda) {
    const patron = `%${escaparLike(busqueda)}%`
    filtros.push({
      [Op.or]: [
        { email: { [Op.iLike]: patron } },
        condicion(fn('concat_ws', ' ', col('names'), col('surnames')), { [Op.iLike]: patron }),
      ],
    })
  }
  return Usuario.findAll({
    where: filtros.length ? { [Op.and]: filtros } : undefined,
    order: [['createdAt', 'DESC'], ['surnames', 'ASC'], ['names', 'ASC']],
  })
}

export const buscarUsuarioParaActualizar = (id, transaction) =>
  Usuario.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })

export const buscarUsuarioPorCorreo = (email, transaction) =>
  Usuario.findOne({ where: { email }, attributes: ['id'], transaction })

export const crearUsuario = datos => Usuario.create(datos)

export const guardarUsuario = (usuario, datos, transaction) => usuario.update(datos, { transaction })

// Trabajos y asignaciones de los usuarios indicados (todos si no se pasa una lista).
export function listarTrabajosPorAutor(usuarioIds) {
  return Trabajo.findAll({
    attributes: ['id', 'ownerId'],
    where: usuarioIds ? { ownerId: usuarioIds } : undefined,
    raw: true,
  })
}

export function listarAsignacionesPorRevisor(usuarioIds) {
  return AsignacionRevision.findAll({
    attributes: ['id', 'reviewerId', 'dueDate'],
    where: usuarioIds ? { reviewerId: usuarioIds } : undefined,
    include: [{ association: 'review', attributes: ['status'], required: false }],
  })
}

export const contarTrabajosDelAutor = (ownerId, transaction) => Trabajo.count({ where: { ownerId }, transaction })

export const contarAsignacionesDelRevisor = (reviewerId, transaction) =>
  AsignacionRevision.count({ where: { reviewerId }, transaction })

// Asignaciones del revisor cuya evaluación todavía no fue enviada (quedan en pausa mientras esté bloqueado).
export async function listarAsignacionesPendientes(reviewerId, transaction) {
  const asignaciones = await AsignacionRevision.findAll({
    attributes: ['id'],
    where: { reviewerId },
    include: [{ association: 'review', attributes: ['status'], required: false }],
    transaction,
  })
  return asignaciones.filter(asignacion => asignacion.review?.status !== 'submitted')
}
