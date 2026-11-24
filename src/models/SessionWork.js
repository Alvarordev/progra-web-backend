import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Trabajo aceptado ubicado en una sesión, con su orden de exposición.
export const SessionWork = sequelize.define(
  'SessionWork',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    position: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1 } },
  },
  {
    tableName: 'session_works',
    indexes: [
      { unique: true, fields: ['work_id'] },
      { unique: true, fields: ['session_id', 'position'] },
    ],
  }
)
