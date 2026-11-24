import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Revisor asignado a un trabajo por el comité.
export const ReviewAssignment = sequelize.define(
  'ReviewAssignment',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: 'review_assignments',
    indexes: [{ unique: true, fields: ['work_id', 'reviewer_id'] }],
  }
)
