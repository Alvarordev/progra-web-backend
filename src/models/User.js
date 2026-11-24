import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// Reúne la ficha del participante, las credenciales y los datos administrativos de Usuarios.
export const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    names: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    surnames: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue('email', String(value).trim().toLowerCase())
      },
    },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    institution: { type: DataTypes.STRING(200), allowNull: false },
    role: {
      type: DataTypes.ENUM('author', 'reviewer', 'both', 'committee'),
      allowNull: false,
    },
    // Carrera y código de alumno: obligatorios para autor y ambos al registrarse.
    degree: { type: DataTypes.STRING(150) },
    studentCode: { type: DataTypes.STRING(20), validate: { isNumeric: true } },
    acceptedTerms: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Concordancia de género en etiquetas como «Autora» o «Coautora».
    isFemale: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    blocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    blockReason: { type: DataTypes.TEXT },
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.names} ${this.surnames}`
      },
    },
  },
  {
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
  }
)
