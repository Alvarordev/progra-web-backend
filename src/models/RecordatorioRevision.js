import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Recordatorio enviado al revisor de una asignación pendiente.
export const RecordatorioRevision = sequelize.define(
  'RecordatorioRevision',
  { id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true } },
  { tableName: 'recordatorios_revision', updatedAt: false }
)
