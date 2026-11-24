import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Dictamen del comité. Promedios y puntajes se calculan a partir de las evaluaciones.
export const Decision = sequelize.define(
  'Decision',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    result: { type: DataTypes.ENUM('accept', 'reject'), allowNull: false },
    feedback: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    status: { type: DataTypes.ENUM('draft', 'published'), allowNull: false, defaultValue: 'draft' },
    publishedAt: { type: DataTypes.DATE },
  },
  {
    tableName: 'decisions',
    indexes: [{ unique: true, fields: ['work_id'] }],
  }
)
