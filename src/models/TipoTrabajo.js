import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const TipoTrabajo = sequelize.define(
  'TipoTrabajo',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    // Texto libre como «8 000 palabras» o «1 lámina A1».
    maxLength: { type: DataTypes.STRING(60), allowNull: false },
    expectedFormat: {
      type: DataTypes.ENUM('PDF', 'PDF · plantilla IEEE', 'PDF · orientación vertical'),
      allowNull: false,
      defaultValue: 'PDF',
    },
    allowsCoauthors: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    maxCoauthors: { type: DataTypes.SMALLINT, validate: { min: 1 } },
  },
  {
    tableName: 'tipos_trabajo',
    indexes: [{ unique: true, fields: ['edition_id', 'name'] }],
    validate: {
      coauthorLimit() {
        if (this.allowsCoauthors ? !this.maxCoauthors : this.maxCoauthors != null) {
          throw new Error('El máximo de coautores solo aplica cuando se admiten coautores.')
        }
      },
    },
  }
)
