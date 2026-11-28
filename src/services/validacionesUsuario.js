export class ErrorUsuario extends Error {
    constructor(mensaje, codigo = 400, errores) {
        super(mensaje);
        this.codigo = codigo;
        this.errores = errores;
    }
}

// Correo institucional de la Universidad de Lima (docentes o alumnos)
export const esCorreoInstitucional = correo =>
    typeof correo === 'string' && correo.length <= 254 && /^[^\s@]+@(?:aloe\.)?ulima\.edu\.pe$/.test(correo);

export const limpiarTexto = (valor) => typeof valor === 'string' ? valor.trim() : '';

export const validarContrasena = (contrasena, confirmacion) => {
    const errores = {};
    if (typeof contrasena !== 'string' || Array.from(contrasena).length < 8 ||
        !/\p{Lu}/u.test(contrasena) || !/[0-9]/.test(contrasena) ||
        Buffer.byteLength(contrasena, 'utf8') > 72) {
        errores.password = 'Use 8 caracteres como mínimo, una mayúscula y un número, hasta 72 bytes UTF-8.';
    }
    if (typeof confirmacion !== 'string' || confirmacion !== contrasena) {
        errores.confirmPassword = 'La confirmación debe coincidir con la contraseña.';
    }
    return errores;
};

export const validarObjeto = (datos) => {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        throw new ErrorUsuario('Envíe un objeto JSON válido.');
    }
};

export const validarDatosPersonales = (datos) => {
    const resultado = {};
    const errores = {};
    const limites = { names: 120, surnames: 120, institution: 200 };
    for (const campo of Object.keys(limites)) {
        resultado[campo] = limpiarTexto(datos[campo]);
        if (!resultado[campo] || Array.from(resultado[campo]).length > limites[campo]) {
            errores[campo] = `Este campo es obligatorio y admite hasta ${limites[campo]} caracteres.`;
        }
    }
    return { resultado, errores };
};

export const validarRegistro = (datos) => {
    validarObjeto(datos);
    const { resultado, errores } = validarDatosPersonales(datos);
    resultado.email = limpiarTexto(datos.email).toLowerCase();
    resultado.role = datos.role;
    resultado.acceptedTerms = datos.acceptedTerms === true;
    resultado.degree = null;
    resultado.studentCode = null;
    if (!esCorreoInstitucional(resultado.email)) {
        errores.email = 'Use un correo institucional válido (@ulima.edu.pe o @aloe.ulima.edu.pe).';
    }
    if (!['author', 'reviewer', 'both'].includes(datos.role)) {
        errores.role = 'Seleccione autor, revisor o ambos.';
    }
    if (!resultado.acceptedTerms) errores.acceptedTerms = 'Debe aceptar las bases y el tratamiento de datos.';
    if (['author', 'both'].includes(datos.role)) {
        resultado.degree = limpiarTexto(datos.degree);
        resultado.studentCode = limpiarTexto(datos.studentCode);
        if (!resultado.degree || resultado.degree.length > 150) errores.degree = 'Indique una carrera válida.';
        if (!/^[0-9]{1,20}$/.test(resultado.studentCode)) errores.studentCode = 'Ingrese un código de alumno de 1 a 20 dígitos.';
    }
    Object.assign(errores, validarContrasena(datos.password, datos.confirmPassword));
    if (Object.keys(errores).length) throw new ErrorUsuario('Revise los datos del registro.', 400, errores);
    return resultado;
};
