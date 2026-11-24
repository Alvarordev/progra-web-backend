import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const Work = sequelize.define(
  'Work',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // Código visible, por ejemplo TRB-2026-042.
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(300), allowNull: false, validate: { notEmpty: true } },
    abstract: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    keywords: { type: DataTypes.ARRAY(DataTypes.STRING(80)), allowNull: false, defaultValue: [] },
    documentUrl: { type: DataTypes.STRING(500) },
    // La decisión publicada fija el estado final aceptado o rechazado.
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'draft',
    },
    submittedAt: { type: DataTypes.DATE },
  },
  { tableName: 'works' }
)
