import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Firmantes de un trabajo. Los coautores pueden no tener cuenta en la aplicación.
export const AutorTrabajo = sequelize.define(
  'AutorTrabajo',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(250), allowNull: false, validate: { notEmpty: true } },
    email: { type: DataTypes.STRING(254), validate: { isEmail: true } },
    institution: { type: DataTypes.STRING(200), allowNull: false },
    isCorresponding: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    position: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1 } },
  },
  {
    tableName: 'autores_trabajo',
    indexes: [{ unique: true, fields: ['work_id', 'position'] }],
  }
)
