import * as usuarios from '../services/usuarios.js';
import { leerCredenciales } from '../middleware/autenticacion.js';
import { opcionesCookie } from '../middleware/sesion.js';
import { huellaContrasena } from '../services/password.js';

export const registrarUsuario = async (req, res, next) => {
    try {
        const data = await usuarios.registrarUsuario(req.body);
        return res.status(201).json({ status: 'success', data });
    } catch (err) { return next(err); }
};

export const iniciarSesion = async (req, res, next) => {
    try {
        const datos = req.get('Authorization') ? leerCredenciales(req) : req.body || {};
        const usuario = await usuarios.comprobarCredenciales(datos.correo, datos.contrasena);
        await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
        req.session.usuarioId = usuario.id;
        req.session.firmaContrasena = huellaContrasena(usuario.passwordHash);
        req.session.cookie.maxAge = req.body?.recordar === true ? 7 * 24 * 60 * 60 * 1000 : null;
        await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
        res.set('Cache-Control', 'no-store');
        return res.status(201).json({ status: 'success', data: usuarios.presentarUsuario(usuario) });
    } catch (err) { return next(err); }
};

export const consultarSesion = async (req, res, next) => {
    try {
        const data = await usuarios.consultarUsuario(res.locals.usuario.id);
        res.set('Cache-Control', 'no-store');
        return res.json({ status: 'success', data });
    } catch (err) { return next(err); }
};

export const cerrarSesion = async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => req.session.destroy(err => err ? reject(err) : resolve()));
        res.clearCookie('congreso.sid', opcionesCookie);
        return res.status(204).end();
    } catch (err) { return next(err); }
};

export const consultarPerfil = async (req, res, next) => {
    try {
        const data = await usuarios.obtenerPerfil(res.locals.usuario.id);
        res.set('Cache-Control', 'no-store');
        return res.json({ status: 'success', data });
    } catch (err) { return next(err); }
};

export const actualizarPerfil = async (req, res, next) => {
    try {
        const data = await usuarios.actualizarPerfil(res.locals.usuario.id, req.body);
        return res.json({ status: 'success', data });
    } catch (err) { return next(err); }
};

export const cambiarContrasena = async (req, res, next) => {
    try {
        const usuarioId = res.locals.usuario.id;
        const vigencia = req.session.cookie.originalMaxAge;
        const firmaContrasena = await usuarios.cambiarContrasena(usuarioId, req.body, req.sessionID);
        if (req.session.usuarioId) {
            await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
            req.session.usuarioId = usuarioId;
            req.session.firmaContrasena = firmaContrasena;
            req.session.cookie.maxAge = vigencia;
            await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
        }
        return res.json({ status: 'success', data: { mensaje: 'Contraseña actualizada.' } });
    } catch (err) { return next(err); }
};

export const listarAsignaciones = async (req, res, next) => {
    try {
        const data = await usuarios.obtenerAsignaciones(res.locals.usuario.id);
        return res.json({ status: 'success', data });
    } catch (err) { return next(err); }
};

export const consultarAccesoTrabajo = async (req, res, next) => {
    try {
        const data = await usuarios.comprobarTrabajoPropio(res.locals.usuario.id, req.params.codigo);
        return res.json({ status: 'success', data });
    } catch (err) { return next(err); }
};
