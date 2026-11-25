import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import * as repositorio from '../repositories/usuariosRepository.js';
import { enviarCodigo } from './correo.js';
import { generarHash } from './password.js';
import { ErrorUsuario, limpiarTexto, validarContrasena } from './validacionesUsuario.js';

const mensajeInvalido = 'El código o la solicitud no son válidos, vencieron o ya se utilizaron.';
const obtenerHash = (token) => createHash('sha256').update(token).digest('hex');
const obtenerHashCodigo = (id, codigo) => createHmac('sha256', process.env.SESSION_SECRET)
    .update(`${id}:${codigo}`).digest('hex');

export const solicitarRecuperacion = async (correo) => {
    correo = limpiarTexto(correo).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 254) {
        throw new ErrorUsuario('Ingrese un correo válido.');
    }
    const cuenta = await repositorio.buscarCredenciales(correo);
    if (!cuenta || cuenta.blocked) return;
    const codigo = String(randomInt(100000, 1000000));
    const registro = await repositorio.ejecutarTransaccion(async transaccion => {
        const usuario = await repositorio.bloquearUsuario(cuenta.id, transaccion);
        if (!usuario || usuario.blocked) return null;
        const anterior = await repositorio.buscarUltimaRecuperacion(cuenta.id, transaccion);
        if (anterior && Date.now() - anterior.createdAt.getTime() < 120000) return null;
        await repositorio.invalidarRecuperaciones(cuenta.id, transaccion);
        return repositorio.crearRecuperacion({
            usuarioId: cuenta.id,
            codigoHash: obtenerHashCodigo(cuenta.id, codigo),
            venceEn: new Date(Date.now() + 30 * 60 * 1000),
        }, transaccion);
    });
    if (!registro) return;
    try {
        await enviarCodigo(correo, codigo);
    } catch (err) {
        await repositorio.guardarRecuperacion(registro, { usadaEn: new Date() });
        throw new ErrorUsuario('No se pudo enviar el correo de recuperación. Intente nuevamente.', 503);
    }
};

export const verificarCodigo = async (correo, codigo) => {
    correo = limpiarTexto(correo).toLowerCase();
    const cuenta = await repositorio.buscarCredenciales(correo);
    if (!cuenta || cuenta.blocked || typeof codigo !== 'string' || !/^[0-9]{6}$/.test(codigo)) {
        throw new ErrorUsuario(mensajeInvalido);
    }
    const token = randomBytes(32).toString('hex');
    const valido = await repositorio.ejecutarTransaccion(async transaccion => {
        await repositorio.bloquearUsuario(cuenta.id, transaccion);
        const registro = await repositorio.buscarRecuperacion(cuenta.id, transaccion);
        if (!registro?.codigoHash || registro.venceEn <= new Date() || registro.intentos >= 5) return false;
        const coincide = timingSafeEqual(
            Buffer.from(registro.codigoHash, 'hex'),
            Buffer.from(obtenerHashCodigo(cuenta.id, codigo), 'hex')
        );
        if (!coincide) {
            const intentos = registro.intentos + 1;
            await repositorio.guardarRecuperacion(registro, {
                intentos, ...(intentos >= 5 ? { usadaEn: new Date(), codigoHash: null } : {}),
            }, transaccion);
            return false;
        }
        await repositorio.guardarRecuperacion(registro, {
            codigoHash: null, tokenHash: obtenerHash(token),
        }, transaccion);
        return true;
    });
    if (!valido) throw new ErrorUsuario(mensajeInvalido);
    return { token };
};

export const restablecerContrasena = async (datos) => {
    if (typeof datos?.token !== 'string' || !/^[a-f0-9]{64}$/.test(datos.token)) {
        throw new ErrorUsuario(mensajeInvalido);
    }
    const errores = validarContrasena(datos.contrasena, datos.confirmacion);
    if (Object.keys(errores).length) throw new ErrorUsuario('Revise la nueva contraseña.', 400, errores);
    const hash = obtenerHash(datos.token);
    const solicitud = await repositorio.consultarToken(hash);
    if (!solicitud) throw new ErrorUsuario(mensajeInvalido);
    await repositorio.ejecutarTransaccion(async transaccion => {
        const usuario = await repositorio.bloquearUsuario(solicitud.usuarioId, transaccion);
        const registro = await repositorio.buscarPorToken(hash, transaccion);
        if (!registro || registro.venceEn <= new Date()) throw new ErrorUsuario(mensajeInvalido);
        if (!usuario || usuario.blocked) throw new ErrorUsuario(mensajeInvalido);
        await repositorio.guardarUsuario(usuario, { passwordHash: await generarHash(datos.contrasena) }, transaccion);
        await repositorio.invalidarRecuperaciones(usuario.id, transaccion);
        await repositorio.invalidarSesiones(usuario.id, transaccion);
    });
};
