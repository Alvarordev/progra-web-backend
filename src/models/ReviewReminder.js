import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Recordatorio enviado al revisor de una asignación pendiente.
export const ReviewReminder = sequelize.define(
  'ReviewReminder',
  { id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true } },
  { tableName: 'review_reminders', updatedAt: false }
)
