import * as recuperaciones from '../services/recuperaciones.js';

export const solicitarRecuperacion = async (req, res, next) => {
    try {
        await recuperaciones.solicitarRecuperacion(req.body?.correo);
        return res.status(202).json({
            status: 'success', data: { mensaje: 'Si la cuenta existe, recibirá un código de recuperación.' },
        });
    } catch (err) { return next(err); }
};

export const verificarCodigo = async (req, res, next) => {
    try {
        const data = await recuperaciones.verificarCodigo(req.body?.correo, req.body?.codigo);
        res.set('Cache-Control', 'no-store');
        return res.json({ status: 'success', data });
    } catch (err) { return next(err); }
};

export const restablecerContrasena = async (req, res, next) => {
    try {
        await recuperaciones.restablecerContrasena(req.body);
        return res.json({ status: 'success', data: { mensaje: 'Contraseña actualizada. Inicie sesión nuevamente.' } });
    } catch (err) { return next(err); }
};
