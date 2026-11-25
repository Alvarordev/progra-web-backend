import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Registro de auditoría para asignaciones, reasignaciones y retiros de revisores.
export const HistorialAsignacion = sequelize.define(
  'HistorialAsignacion',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    action: {
      type: DataTypes.ENUM('assigned', 'reassigned', 'removed'),
      allowNull: false,
    },
    reason: { type: DataTypes.TEXT },
    conflictJustification: { type: DataTypes.TEXT },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: 'historial_asignaciones',
    updatedAt: false,
  }
)
