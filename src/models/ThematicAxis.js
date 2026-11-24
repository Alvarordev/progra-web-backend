import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const ThematicAxis = sequelize.define(
  'ThematicAxis',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true } },
    description: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
    // Responsable mostrado en la configuración; no es necesariamente una cuenta.
    coordinator: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true } },
  },
  {
    tableName: 'thematic_axes',
    indexes: [{ unique: true, fields: ['edition_id', 'name'] }],
  }
)
