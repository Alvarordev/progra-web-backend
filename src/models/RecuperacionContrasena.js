import { DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export const RecuperacionContrasena = sequelize.define('RecuperacionContrasena', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    codigoHash: { type: DataTypes.STRING(64) },
    tokenHash: { type: DataTypes.STRING(64), unique: true },
    venceEn: { type: DataTypes.DATE, allowNull: false },
    intentos: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    usadaEn: { type: DataTypes.DATE },
}, { tableName: 'recuperaciones_contrasena' });
