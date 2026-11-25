import session from 'express-session';
import conectarPostgres from 'connect-pg-simple';

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.SESSION_SECRET.startsWith('reemplazar-')) {
    throw new Error('Configure SESSION_SECRET en .env con una clave aleatoria propia de al menos 32 caracteres.');
}

const AlmacenPostgres = conectarPostgres(session);
export const almacenSesiones = new AlmacenPostgres({
    conObject: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    },
    tableName: 'sesiones',
    ttl: 8 * 60 * 60,
});

export const opcionesCookie = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api',
};

export const sesion = session({
    name: 'congreso.sid',
    secret: process.env.SESSION_SECRET,
    store: almacenSesiones,
    resave: false,
    saveUninitialized: false,
    cookie: opcionesCookie,
});
