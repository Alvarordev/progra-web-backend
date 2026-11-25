import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Puntaje por criterio. Guarda nombre y peso usados al evaluar para conservarlos
// aunque el criterio cambie o se elimine después del envío.
export const RevisionCriterio = sequelize.define(
  'RevisionCriterio',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    criterionName: { type: DataTypes.STRING(120), allowNull: false },
    criterionWeight: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1, max: 100 } },
    score: { type: DataTypes.SMALLINT, validate: { min: 0, max: 20 } },
    comment: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  },
  {
    tableName: 'revision_criterios',
    indexes: [{ unique: true, fields: ['review_id', 'criterion_id'] }],
  }
)
