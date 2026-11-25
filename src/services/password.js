import { createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcrypt';

const derivar = promisify(scrypt);

export const generarHash = async (contrasena) => {
    if (typeof contrasena !== 'string' || !contrasena || Buffer.byteLength(contrasena, 'utf8') > 72) {
        throw new Error('La contraseña es obligatoria y admite hasta 72 bytes UTF-8.');
    }
    return bcrypt.hash(contrasena, 12);
};

export const verificarContrasena = async (contrasena, hash) => {
    if (typeof contrasena !== 'string' || !contrasena || Buffer.byteLength(contrasena, 'utf8') > 72) return false;
    if (/^\$2[aby]\$/.test(hash ?? '')) return bcrypt.compare(contrasena, hash);
    const [, sal, clave] = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(hash ?? '') ?? [];
    const calculada = await derivar(contrasena, sal ?? '0'.repeat(32), 64);
    return Boolean(clave && timingSafeEqual(calculada, Buffer.from(clave, 'hex')));
};

export const huellaContrasena = (hash) => createHash('sha256').update(hash ?? '').digest('hex');
export const crearHash = generarHash;
export const verificarPassword = verificarContrasena;
