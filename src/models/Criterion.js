import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// La suma de pesos puede quedar incompleta; abrir la revisión exige 100.
export const Criterion = sequelize.define(
  'Criterion',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    description: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
    weight: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1, max: 100 } },
  },
  {
    tableName: 'criteria',
    indexes: [{ unique: true, fields: ['edition_id', 'name'] }],
  }
)
