import { sequelize } from '../db/sequelize.js'
import { Criterio } from './Criterio.js'
import { Decision } from './Decision.js'
import { Edicion } from './Edicion.js'
import { SesionPrograma } from './SesionPrograma.js'
import { Revision } from './Revision.js'
import { AsignacionRevision } from './AsignacionRevision.js'
import { HistorialAsignacion } from './HistorialAsignacion.js'
import { RecordatorioRevision } from './RecordatorioRevision.js'
import { RevisionCriterio } from './RevisionCriterio.js'
import { Sala } from './Sala.js'
import { TrabajoSesion } from './TrabajoSesion.js'
import { EjeTematico } from './EjeTematico.js'
import { Usuario } from './Usuario.js'
import { Trabajo } from './Trabajo.js'
import { AutorTrabajo } from './AutorTrabajo.js'
import { TipoTrabajo } from './TipoTrabajo.js'

const required = name => ({ foreignKey: { name, allowNull: false } })

// Configuración de cada edición
for (const model of [EjeTematico, TipoTrabajo, Criterio, Trabajo, SesionPrograma]) {
  Edicion.hasMany(model, { ...required('editionId'), onDelete: 'CASCADE' })
  model.belongsTo(Edicion, { as: 'edition', ...required('editionId') })
}

// Líneas de interés de los revisores
Usuario.belongsToMany(EjeTematico, {
  through: 'intereses_revisor',
  as: 'interests',
  foreignKey: 'userId',
  otherKey: 'thematicAxisId',
})
EjeTematico.belongsToMany(Usuario, {
  through: 'intereses_revisor',
  as: 'interestedReviewers',
  foreignKey: 'thematicAxisId',
  otherKey: 'userId',
})

// Trabajos y firmantes
Usuario.hasMany(Trabajo, { as: 'ownedWorks', ...required('ownerId') })
Trabajo.belongsTo(Usuario, { as: 'owner', ...required('ownerId') })
EjeTematico.hasMany(Trabajo, { ...required('thematicAxisId'), onDelete: 'RESTRICT' })
Trabajo.belongsTo(EjeTematico, { as: 'thematicAxis', ...required('thematicAxisId'), onDelete: 'RESTRICT' })
TipoTrabajo.hasMany(Trabajo, { ...required('workTypeId'), onDelete: 'RESTRICT' })
Trabajo.belongsTo(TipoTrabajo, { as: 'workType', ...required('workTypeId'), onDelete: 'RESTRICT' })

Trabajo.hasMany(AutorTrabajo, { as: 'authors', ...required('workId'), onDelete: 'CASCADE' })
AutorTrabajo.belongsTo(Trabajo, required('workId'))
Usuario.hasMany(AutorTrabajo, { as: 'authorships', foreignKey: 'userId', onDelete: 'SET NULL' })
AutorTrabajo.belongsTo(Usuario, { foreignKey: 'userId' })

// Asignaciones, evaluaciones y recordatorios
Trabajo.hasMany(AsignacionRevision, { as: 'assignments', ...required('workId'), onDelete: 'CASCADE' })
AsignacionRevision.belongsTo(Trabajo, { as: 'work', ...required('workId') })
Usuario.hasMany(AsignacionRevision, { as: 'reviewAssignments', ...required('reviewerId') })
AsignacionRevision.belongsTo(Usuario, { as: 'reviewer', ...required('reviewerId') })

AsignacionRevision.hasOne(Revision, { as: 'review', ...required('assignmentId'), onDelete: 'CASCADE' })
Revision.belongsTo(AsignacionRevision, { as: 'assignment', ...required('assignmentId') })

Revision.hasMany(RevisionCriterio, { as: 'scores', ...required('reviewId'), onDelete: 'CASCADE' })
RevisionCriterio.belongsTo(Revision, required('reviewId'))
Criterio.hasMany(RevisionCriterio, { foreignKey: 'criterionId', onDelete: 'SET NULL' })
RevisionCriterio.belongsTo(Criterio, { as: 'criterion', foreignKey: 'criterionId' })

AsignacionRevision.hasMany(RecordatorioRevision, {
  as: 'reminders',
  ...required('assignmentId'),
  onDelete: 'CASCADE',
})
RecordatorioRevision.belongsTo(AsignacionRevision, { as: 'assignment', ...required('assignmentId') })
Usuario.hasMany(RecordatorioRevision, { as: 'sentReminders', foreignKey: 'sentById', onDelete: 'SET NULL' })
RecordatorioRevision.belongsTo(Usuario, { as: 'sentBy', foreignKey: 'sentById' })

Trabajo.hasMany(HistorialAsignacion, {
  as: 'assignmentHistory',
  ...required('workId'),
  onDelete: 'CASCADE',
})
HistorialAsignacion.belongsTo(Trabajo, { as: 'work', ...required('workId') })
Usuario.hasMany(HistorialAsignacion, {
  as: 'assignmentLogsAsReviewer',
  foreignKey: 'reviewerId',
  onDelete: 'SET NULL',
})
HistorialAsignacion.belongsTo(Usuario, { as: 'reviewer', foreignKey: 'reviewerId' })
Usuario.hasMany(HistorialAsignacion, {
  as: 'assignmentLogsAsPreviousReviewer',
  foreignKey: 'previousReviewerId',
  onDelete: 'SET NULL',
})
HistorialAsignacion.belongsTo(Usuario, { as: 'previousReviewer', foreignKey: 'previousReviewerId' })
Usuario.hasMany(HistorialAsignacion, {
  as: 'performedAssignmentLogs',
  foreignKey: 'performedById',
  onDelete: 'SET NULL',
})
HistorialAsignacion.belongsTo(Usuario, { as: 'performedBy', foreignKey: 'performedById' })

// Dictamen del comité
Trabajo.hasOne(Decision, { as: 'decision', ...required('workId'), onDelete: 'CASCADE' })
Decision.belongsTo(Trabajo, { as: 'work', ...required('workId') })

// Programa
Sala.hasMany(SesionPrograma, required('roomId'))
SesionPrograma.belongsTo(Sala, required('roomId'))
EjeTematico.hasMany(SesionPrograma, { ...required('thematicAxisId'), onDelete: 'RESTRICT' })
SesionPrograma.belongsTo(EjeTematico, { ...required('thematicAxisId'), onDelete: 'RESTRICT' })
Usuario.hasMany(SesionPrograma, { as: 'moderatedSessions', foreignKey: 'moderatorId', onDelete: 'SET NULL' })
SesionPrograma.belongsTo(Usuario, { as: 'moderator', foreignKey: 'moderatorId' })

SesionPrograma.hasMany(TrabajoSesion, { as: 'works', ...required('sessionId'), onDelete: 'CASCADE' })
TrabajoSesion.belongsTo(SesionPrograma, { as: 'session', ...required('sessionId') })
Trabajo.hasOne(TrabajoSesion, { as: 'programSlot', ...required('workId'), onDelete: 'CASCADE' })
TrabajoSesion.belongsTo(Trabajo, required('workId'))

export {
  sequelize,
  Criterio,
  Decision,
  Edicion,
  SesionPrograma,
  Revision,
  AsignacionRevision,
  HistorialAsignacion,
  RecordatorioRevision,
  RevisionCriterio,
  Sala,
  TrabajoSesion,
  EjeTematico,
  Usuario,
  Trabajo,
  AutorTrabajo,
  TipoTrabajo,
}
