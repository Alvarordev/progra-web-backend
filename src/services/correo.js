import nodemailer from 'nodemailer';

const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST || '127.0.0.1',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: process.env.SMTP_SECURE === 'true',
    ...(process.env.SMTP_USER ? {
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    } : {}),
});

export const enviarCodigo = (correo, codigo) => transporte.sendMail({
    from: process.env.SMTP_FROM || 'Congreso <congreso@ulima.edu.pe>',
    to: correo,
    subject: 'Recuperación de contraseña del congreso',
    text: `Su código de recuperación es ${codigo}. Vence en 30 minutos y solo puede utilizarse una vez.`,
});

export const enviarInvitacion = (correo, nombre) => transporte.sendMail({
    from: process.env.SMTP_FROM || 'Congreso <congreso@ulima.edu.pe>',
    to: correo,
    subject: 'Invitación al congreso académico',
    text: `Hola ${nombre}: el comité del congreso creó una cuenta para usted. Para definir su contraseña, ingrese a la pantalla «¿Olvidó su contraseña?» con este correo y siga las instrucciones.`,
});

export const enviarAvisoBloqueo = (correo, nombre, motivo) => transporte.sendMail({
    from: process.env.SMTP_FROM || 'Congreso <congreso@ulima.edu.pe>',
    to: correo,
    subject: 'Su cuenta del congreso fue bloqueada',
    text: `Hola ${nombre}: el comité bloqueó su cuenta. Motivo: ${motivo}\n\nSi considera que es un error, comuníquese con el comité organizador.`,
});
