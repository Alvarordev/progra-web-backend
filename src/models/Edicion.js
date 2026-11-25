import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Datos generales, estado y cronograma de una edición del congreso.
export const Edicion = sequelize.define(
  'Edicion',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false, validate: { notEmpty: true } },
    year: { type: DataTypes.SMALLINT, allowNull: false, unique: true },
    venue: { type: DataTypes.STRING(250), allowNull: false, validate: { notEmpty: true } },
    description: { type: DataTypes.STRING(400), allowNull: false, defaultValue: '' },
    status: {
      type: DataTypes.ENUM('preparation', 'reception_open', 'under_review'),
      allowNull: false,
      defaultValue: 'preparation',
    },
    // Cronograma en horario de Lima.
    receptionDeadline: { type: DataTypes.DATE, allowNull: false },
    reviewDeadline: { type: DataTypes.DATE, allowNull: false },
    publicationDate: { type: DataTypes.DATE, allowNull: false },
    // Instantánea del programa que consulta el público; editar sesiones no la modifica.
    programPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    programSnapshot: { type: DataTypes.JSONB },
  },
  {
    tableName: 'ediciones',
    validate: {
      scheduleOrder() {
        if (this.reviewDeadline <= this.receptionDeadline) {
          throw new Error('La revisión debe cerrar después de la recepción.')
        }
        if (this.publicationDate <= this.reviewDeadline) {
          throw new Error('La publicación debe ser posterior al cierre de la revisión.')
        }
      },
    },
  }
)
