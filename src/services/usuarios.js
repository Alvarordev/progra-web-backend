import { UniqueConstraintError, ValidationError } from 'sequelize';
import * as repositorio from '../repositories/usuariosRepository.js';
import { generarHash, verificarContrasena, huellaContrasena } from './password.js';
import {
    ErrorUsuario, limpiarTexto, validarObjeto, validarRegistro,
    validarDatosPersonales, validarContrasena,
} from './validacionesUsuario.js';

export const presentarUsuario = (usuario) => ({
    userId: usuario.id,
    names: usuario.names,
    surnames: usuario.surnames,
    name: usuario.fullName,
    email: usuario.email,
    institution: usuario.institution,
    role: usuario.role,
    degree: usuario.degree ?? '',
    studentCode: usuario.studentCode ?? '',
    acceptedTerms: usuario.acceptedTerms,
});

export const registrarUsuario = async (datos) => {
    const cuenta = validarRegistro(datos);
    if (await repositorio.buscarCredenciales(cuenta.email)) {
        throw new ErrorUsuario('Ya existe una cuenta con este correo.', 409);
    }
    try {
        const usuario = await repositorio.crearUsuario({ ...cuenta, passwordHash: await generarHash(datos.password) });
        return presentarUsuario(usuario);
    } catch (err) {
        if (err instanceof UniqueConstraintError) throw new ErrorUsuario('Ya existe una cuenta con este correo.', 409);
        if (err instanceof ValidationError) {
            const errores = {};
            err.errors.forEach(campo => { errores[campo.path] = 'El valor no cumple el formato esperado.'; });
            throw new ErrorUsuario('Revise los datos del registro.', 400, errores);
        }
        throw err;
    }
};

export const comprobarCredenciales = async (correo, contrasena) => {
    const usuario = await repositorio.buscarCredenciales(limpiarTexto(correo).toLowerCase());
    const coincide = await verificarContrasena(contrasena, usuario?.passwordHash);
    if (!coincide || usuario.blocked) throw new ErrorUsuario('El correo o la contraseña no son correctos.', 401);
    if (usuario.passwordHash.startsWith('scrypt:')) {
        const nuevoHash = await generarHash(contrasena);
        const [actualizadas] = await repositorio.renovarHashAnterior(usuario.id, usuario.passwordHash, nuevoHash);
        if (!actualizadas) throw new ErrorUsuario('Inicie sesión nuevamente.', 401);
        usuario.passwordHash = nuevoHash;
    }
    return usuario;
};

export const consultarUsuario = async (id) => {
    const usuario = await repositorio.buscarUsuario(id);
    if (!usuario || usuario.blocked) throw new ErrorUsuario('Inicie sesión nuevamente.', 401);
    return presentarUsuario(usuario);
};

const fechaLima = (fecha) => fecha.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric',
});

export const obtenerAsignaciones = async (usuarioId) => {
    const asignaciones = await repositorio.listarAsignaciones(usuarioId);
    return asignaciones.map(asignacion => {
        const entregada = asignacion.review?.status === 'submitted';
        const vencida = !entregada && new Date(`${asignacion.dueDate}T23:59:59-05:00`) < new Date();
        return {
            codigo: asignacion.work.code,
            titulo: asignacion.work.title,
            eje: asignacion.work.thematicAxis.name,
            tipoTrabajo: asignacion.work.workType.name,
            tipoEstado: entregada ? 'entregada' : vencida ? 'vencida' : 'pendiente',
            estado: entregada ? 'Entregada' : vencida ? 'Vencida' : 'Revisión pendiente',
            fecha: entregada
                ? `Enviada el ${fechaLima(asignacion.review.submittedAt ?? asignacion.review.updatedAt)}`
                : `Vence el ${asignacion.dueDate.split('-').reverse().join('/')}`,
            accion: entregada ? null : vencida ? 'Evaluar ahora' : 'Evaluar',
        };
    });
};

export const obtenerPerfil = async (usuarioId) => {
    const usuario = await repositorio.buscarUsuario(usuarioId);
    if (!usuario || usuario.blocked) throw new ErrorUsuario('Inicie sesión nuevamente.', 401);
    const intereses = await repositorio.cargarIntereses(usuario);
    const asignaciones = ['reviewer', 'both'].includes(usuario.role) ? await obtenerAsignaciones(usuario.id) : [];
    const entregadas = asignaciones.filter(asignacion => asignacion.tipoEstado === 'entregada').length;
    return {
        ...presentarUsuario(usuario),
        interestIds: intereses.map(eje => String(eje.id)),
        actividad: {
            asignadas: asignaciones.length,
            entregadas,
            pendientes: asignaciones.length - entregadas,
            vencidas: asignaciones.filter(asignacion => asignacion.tipoEstado === 'vencida').length,
        },
    };
};

export const actualizarPerfil = async (usuarioId, datos) => {
    validarObjeto(datos);
    await repositorio.ejecutarTransaccion(async transaccion => {
        const usuario = await repositorio.bloquearUsuario(usuarioId, transaccion);
        if (!usuario || usuario.blocked) throw new ErrorUsuario('Inicie sesión nuevamente.', 401);
        const { resultado, errores } = validarDatosPersonales({
            names: datos.names ?? usuario.names,
            surnames: datos.surnames ?? usuario.surnames,
            institution: datos.institution ?? usuario.institution,
        });
        if (datos.email !== undefined && limpiarTexto(datos.email).toLowerCase() !== usuario.email) {
            errores.email = 'El cambio de correo lo administra el comité.';
        }
        if (Object.keys(errores).length) throw new ErrorUsuario('Revise sus datos personales.', 400, errores);
        if (datos.interestIds !== undefined) {
            if (!['reviewer', 'both'].includes(usuario.role)) throw new ErrorUsuario('Esta selección requiere rol de revisor.', 403);
            if (!Array.isArray(datos.interestIds) || datos.interestIds.length > 100 ||
                !datos.interestIds.every(id => /^[1-9][0-9]*$/.test(String(id)) && Number.isSafeInteger(Number(id)))) {
                throw new ErrorUsuario('Las líneas de interés no son válidas.');
            }
            const ids = [...new Set(datos.interestIds.map(Number))];
            const ejes = await repositorio.listarEjesActuales();
            if (ids.some(id => !ejes.some(eje => eje.id === id))) throw new ErrorUsuario('Seleccione ejes de la edición vigente.');
            await repositorio.guardarIntereses(usuario, ids, transaccion);
        }
        await repositorio.guardarUsuario(usuario, resultado, transaccion);
    });
    return obtenerPerfil(usuarioId);
};

export const cambiarContrasena = async (usuarioId, datos, sesionId) => {
    validarObjeto(datos);
    const errores = validarContrasena(datos.contrasena, datos.confirmacion);
    if (Object.keys(errores).length) throw new ErrorUsuario('Revise la nueva contraseña.', 400, errores);
    return repositorio.ejecutarTransaccion(async transaccion => {
        const usuario = await repositorio.bloquearUsuario(usuarioId, transaccion);
        if (!usuario || usuario.blocked) throw new ErrorUsuario('Inicie sesión nuevamente.', 401);
        const credenciales = await repositorio.buscarCredenciales(usuario.email);
        if (!await verificarContrasena(datos.contrasenaActual, credenciales.passwordHash)) {
            throw new ErrorUsuario('La contraseña actual no es correcta.', 400);
        }
        const passwordHash = await generarHash(datos.contrasena);
        await repositorio.guardarUsuario(usuario, { passwordHash }, transaccion);
        await repositorio.invalidarRecuperaciones(usuario.id, transaccion);
        await repositorio.invalidarSesiones(usuario.id, transaccion, sesionId);
        return huellaContrasena(passwordHash);
    });
};

export const comprobarTrabajoPropio = async (usuarioId, codigo) => {
    if (!await repositorio.buscarTrabajoDelAutor(usuarioId, codigo)) {
        throw new ErrorUsuario('Solo puede consultar sus propios trabajos.', 403);
    }
    return { permitido: true };
};
