import { sequelize } from '../db/sequelize.js'
import { Criterion } from './Criterion.js'
import { Decision } from './Decision.js'
import { Edition } from './Edition.js'
import { ProgramSession } from './ProgramSession.js'
import { Review } from './Review.js'
import { ReviewAssignment } from './ReviewAssignment.js'
import { ReviewReminder } from './ReviewReminder.js'
import { ReviewScore } from './ReviewScore.js'
import { Room } from './Room.js'
import { SessionWork } from './SessionWork.js'
import { ThematicAxis } from './ThematicAxis.js'
import { User } from './User.js'
import { Work } from './Work.js'
import { WorkAuthor } from './WorkAuthor.js'
import { WorkType } from './WorkType.js'

const required = name => ({ foreignKey: { name, allowNull: false } })

// Configuración de cada edición
for (const model of [ThematicAxis, WorkType, Criterion, Work, ProgramSession]) {
  Edition.hasMany(model, { ...required('editionId'), onDelete: 'CASCADE' })
  model.belongsTo(Edition, required('editionId'))
}

// Líneas de interés de los revisores
User.belongsToMany(ThematicAxis, {
  through: 'reviewer_interests',
  as: 'interests',
  foreignKey: 'userId',
  otherKey: 'thematicAxisId',
})
ThematicAxis.belongsToMany(User, {
  through: 'reviewer_interests',
  as: 'interestedReviewers',
  foreignKey: 'thematicAxisId',
  otherKey: 'userId',
})

// Trabajos y firmantes
User.hasMany(Work, { as: 'ownedWorks', ...required('ownerId') })
Work.belongsTo(User, { as: 'owner', ...required('ownerId') })
ThematicAxis.hasMany(Work, required('thematicAxisId'))
Work.belongsTo(ThematicAxis, required('thematicAxisId'))
WorkType.hasMany(Work, required('workTypeId'))
Work.belongsTo(WorkType, required('workTypeId'))

Work.hasMany(WorkAuthor, { as: 'authors', ...required('workId'), onDelete: 'CASCADE' })
WorkAuthor.belongsTo(Work, required('workId'))
User.hasMany(WorkAuthor, { as: 'authorships', foreignKey: 'userId', onDelete: 'SET NULL' })
WorkAuthor.belongsTo(User, { foreignKey: 'userId' })

// Asignaciones, evaluaciones y recordatorios
Work.hasMany(ReviewAssignment, { as: 'assignments', ...required('workId'), onDelete: 'CASCADE' })
ReviewAssignment.belongsTo(Work, required('workId'))
User.hasMany(ReviewAssignment, { as: 'reviewAssignments', ...required('reviewerId') })
ReviewAssignment.belongsTo(User, { as: 'reviewer', ...required('reviewerId') })

ReviewAssignment.hasOne(Review, { ...required('assignmentId'), onDelete: 'CASCADE' })
Review.belongsTo(ReviewAssignment, { as: 'assignment', ...required('assignmentId') })

Review.hasMany(ReviewScore, { as: 'scores', ...required('reviewId'), onDelete: 'CASCADE' })
ReviewScore.belongsTo(Review, required('reviewId'))
Criterion.hasMany(ReviewScore, { foreignKey: 'criterionId', onDelete: 'SET NULL' })
ReviewScore.belongsTo(Criterion, { foreignKey: 'criterionId' })

ReviewAssignment.hasMany(ReviewReminder, {
  as: 'reminders',
  ...required('assignmentId'),
  onDelete: 'CASCADE',
})
ReviewReminder.belongsTo(ReviewAssignment, { as: 'assignment', ...required('assignmentId') })
User.hasMany(ReviewReminder, { as: 'sentReminders', foreignKey: 'sentById', onDelete: 'SET NULL' })
ReviewReminder.belongsTo(User, { as: 'sentBy', foreignKey: 'sentById' })

// Dictamen del comité
Work.hasOne(Decision, { ...required('workId'), onDelete: 'CASCADE' })
Decision.belongsTo(Work, required('workId'))

// Programa
Room.hasMany(ProgramSession, required('roomId'))
ProgramSession.belongsTo(Room, required('roomId'))
ThematicAxis.hasMany(ProgramSession, required('thematicAxisId'))
ProgramSession.belongsTo(ThematicAxis, required('thematicAxisId'))
User.hasMany(ProgramSession, { as: 'moderatedSessions', foreignKey: 'moderatorId', onDelete: 'SET NULL' })
ProgramSession.belongsTo(User, { as: 'moderator', foreignKey: 'moderatorId' })

ProgramSession.hasMany(SessionWork, { as: 'works', ...required('sessionId'), onDelete: 'CASCADE' })
SessionWork.belongsTo(ProgramSession, { as: 'session', ...required('sessionId') })
Work.hasOne(SessionWork, { as: 'programSlot', ...required('workId'), onDelete: 'CASCADE' })
SessionWork.belongsTo(Work, required('workId'))

export {
  sequelize,
  Criterion,
  Decision,
  Edition,
  ProgramSession,
  Review,
  ReviewAssignment,
  ReviewReminder,
  ReviewScore,
  Room,
  SessionWork,
  ThematicAxis,
  User,
  Work,
  WorkAuthor,
  WorkType,
}
