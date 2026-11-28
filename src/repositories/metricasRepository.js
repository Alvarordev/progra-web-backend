import { AsignacionRevision, Edicion, EjeTematico, Trabajo, Usuario } from '../models/index.js'

export function obtenerEdicion(edicionId) {
  if (edicionId) return Edicion.findByPk(edicionId)
  return Edicion.findOne({ order: [['year', 'DESC'], ['id', 'DESC']] })
}

export const listarTrabajosDeEdicion = editionId =>
  Trabajo.findAll({ attributes: ['id', 'status', 'thematicAxisId'], where: { editionId }, raw: true })

export const listarEjesDeEdicion = editionId =>
  EjeTematico.findAll({ attributes: ['id', 'name'], where: { editionId }, order: [['id', 'ASC']], raw: true })

// Asignaciones de los trabajos de la edición, con el revisor y el estado de su evaluación.
export const listarAsignacionesDeEdicion = editionId =>
  AsignacionRevision.findAll({
    attributes: ['id', 'reviewerId', 'dueDate', 'createdAt'],
    include: [
      { association: 'work', attributes: ['id'], where: { editionId }, required: true },
      { association: 'reviewer', attributes: ['id', 'names', 'surnames', 'institution', 'blocked'] },
      { association: 'review', attributes: ['status', 'submittedAt'], required: false },
    ],
  })

export const contarRevisoresActivos = () =>
  Usuario.count({ where: { role: ['reviewer', 'both'], blocked: false } })
