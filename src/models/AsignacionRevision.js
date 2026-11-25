import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Revisor asignado a un trabajo por el comité.
export const AsignacionRevision = sequelize.define(
  'AsignacionRevision',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: 'asignaciones_revision',
    indexes: [{ unique: true, fields: ['work_id', 'reviewer_id'] }],
  }
)
