import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Evaluación de una asignación. El borrador admite campos incompletos.
export const Review = sequelize.define(
  'Review',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    status: { type: DataTypes.ENUM('draft', 'submitted'), allowNull: false, defaultValue: 'draft' },
    recommendation: { type: DataTypes.ENUM('accept', 'revisions', 'reject') },
    authorComment: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    committeeComment: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    submittedAt: { type: DataTypes.DATE },
  },
  {
    tableName: 'reviews',
    indexes: [{ unique: true, fields: ['assignment_id'] }],
    validate: {
      submittedIsComplete() {
        if (this.status === 'submitted' && (!this.recommendation || !this.authorComment.trim())) {
          throw new Error('Una evaluación enviada requiere recomendación y comentario al autor.')
        }
      },
    },
  }
)
