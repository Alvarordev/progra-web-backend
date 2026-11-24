import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const Room = sequelize.define(
  'Room',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    location: { type: DataTypes.STRING(200), allowNull: false },
  },
  { tableName: 'rooms' }
)
