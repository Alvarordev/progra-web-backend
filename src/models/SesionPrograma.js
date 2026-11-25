import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Sesión del programa: bloque de exposiciones en una sala y horario.
export const SesionPrograma = sequelize.define(
  'SesionPrograma',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false, validate: { notEmpty: true } },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    startTime: { type: DataTypes.TIME, allowNull: false },
    endTime: { type: DataTypes.TIME, allowNull: false },
  },
  {
    tableName: 'sesiones_programa',
    validate: {
      timeOrder() {
        if (this.startTime >= this.endTime) {
          throw new Error('La hora de inicio debe ser anterior a la hora de fin.')
        }
      },
    },
  }
)
