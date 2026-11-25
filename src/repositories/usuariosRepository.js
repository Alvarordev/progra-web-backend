import {
    sequelize, Usuario, Edicion, EjeTematico, Trabajo, AsignacionRevision,
} from '../models/index.js';
import { RecuperacionContrasena } from '../models/RecuperacionContrasena.js';

export const ejecutarTransaccion = (operacion) => sequelize.transaction(operacion);
export const buscarUsuario = (id) => Usuario.findByPk(id);
export const buscarUsuarioConClave = (id) => Usuario.scope('withPassword').findByPk(id);
export const buscarCredenciales = (correo) => Usuario.scope('withPassword').findOne({ where: { email: correo } });
export const crearUsuario = (datos) => Usuario.create(datos);
export const guardarUsuario = (usuario, datos, transaction) => usuario.update(datos, { transaction });
export const renovarHashAnterior = (id, anterior, nuevo) => Usuario.update({ passwordHash: nuevo }, {
    where: { id, passwordHash: anterior },
});

export const cargarIntereses = (usuario) => usuario.getInterests({ attributes: ['id'] });
export const guardarIntereses = (usuario, ids, transaction) => usuario.setInterests(ids, { transaction });
export const listarEjesActuales = async () => {
    const edicion = await Edicion.findOne({ order: [['year', 'DESC']] });
    return edicion ? EjeTematico.findAll({ where: { editionId: edicion.id } }) : [];
};

export const listarAsignaciones = (usuarioId) => AsignacionRevision.findAll({
    where: { reviewerId: usuarioId },
    include: [
        { association: 'review', attributes: ['status', 'updatedAt', 'recommendation'] },
        { association: 'work', include: ['thematicAxis', 'workType'] },
    ],
    order: [['dueDate', 'ASC'], ['id', 'ASC']],
});
export const buscarTrabajoPropio = (usuarioId, codigo) => Trabajo.findOne({
    where: { ownerId: usuarioId, code: codigo }, attributes: ['id'],
});

export const bloquearUsuario = (id, transaction) => Usuario.findByPk(id, {
    transaction, lock: transaction.LOCK.UPDATE,
});
export const buscarRecuperacion = (usuarioId, transaction) => RecuperacionContrasena.findOne({
    where: { usuarioId, usadaEn: null }, order: [['createdAt', 'DESC']],
    transaction, lock: transaction.LOCK.UPDATE,
});
export const buscarUltimaRecuperacion = (usuarioId, transaction) => RecuperacionContrasena.findOne({
    where: { usuarioId }, order: [['createdAt', 'DESC']], transaction,
});
export const crearRecuperacion = (datos, transaction) => RecuperacionContrasena.create(datos, { transaction });
export const guardarRecuperacion = (registro, datos, transaction) => registro.update(datos, { transaction });
export const invalidarRecuperaciones = (usuarioId, transaction) => RecuperacionContrasena.update({
    usadaEn: new Date(), codigoHash: null, tokenHash: null,
}, { where: { usuarioId, usadaEn: null }, transaction });
export const buscarPorToken = (tokenHash, transaction) => RecuperacionContrasena.findOne({
    where: { tokenHash, usadaEn: null }, transaction, lock: transaction.LOCK.UPDATE,
});
export const consultarToken = (tokenHash) => RecuperacionContrasena.findOne({ where: { tokenHash, usadaEn: null } });
export const invalidarSesiones = (usuarioId, transaction, conservar) => sequelize.query(
    'DELETE FROM sesiones WHERE sess->>\'usuarioId\' = :usuarioId AND (:conservar IS NULL OR sid <> :conservar)',
    { replacements: { usuarioId, conservar: conservar ?? null }, transaction }
);
