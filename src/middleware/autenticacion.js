import { buscarUsuarioConClave } from '../repositories/usuariosRepository.js';
import { comprobarCredenciales } from '../services/usuarios.js';
import { huellaContrasena } from '../services/password.js';
import { opcionesCookie } from './sesion.js';

export const leerCredenciales = (req) => {
    const encabezado = req.get('Authorization') || '';
    const token = encabezado.length <= 2048 && /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(encabezado)?.[1];
    if (!token) return {};
    const texto = Buffer.from(token, 'base64').toString('utf8');
    const separador = texto.indexOf(':');
    return separador > 0 ? { correo: texto.slice(0, separador), contrasena: texto.slice(separador + 1) } : {};
};

export const autenticar = async (req, res, next) => {
    try {
        let usuario;
        if (req.get('Authorization')) {
            const { correo, contrasena } = leerCredenciales(req);
            usuario = await comprobarCredenciales(correo, contrasena);
        } else if (req.session?.usuarioId) {
            usuario = await buscarUsuarioConClave(req.session.usuarioId);
            if (req.session.firmaContrasena !== huellaContrasena(usuario?.passwordHash)) usuario = null;
        }
        if (!usuario || usuario.blocked) {
            if (req.session?.usuarioId) {
                await new Promise((resolve, reject) => req.session.destroy(err => err ? reject(err) : resolve()));
                res.clearCookie('congreso.sid', opcionesCookie);
            }
            return res.status(401).json({ status: 'error', mensaje: 'Inicie sesión para continuar.' });
        }
        res.locals.usuario = { id: usuario.id, rol: usuario.role };
        return next();
    } catch (err) {
        return next(err);
    }
};

export const permitirRoles = (...roles) => (req, res, next) => {
    if (roles.includes(res.locals.usuario?.rol)) return next();
    return res.status(403).json({ status: 'error', mensaje: 'No tiene acceso a esta operación.' });
};
