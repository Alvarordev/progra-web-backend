import { ErrorUsuario, limpiarTexto, validarObjeto } from './validacionesUsuario.js'

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LIMITE_NOMBRE = 200
const MAXIMO_ENTERO = 2147483647

const esEntero = valor => /^[1-9]\d{0,9}$/.test(String(valor ?? '')) && Number(valor) <= MAXIMO_ENTERO

function esFechaReal(texto) {
  const coincidencia = PATRON_FECHA.exec(texto)
  if (!coincidencia) return false
  const [, anio, mes, dia] = coincidencia.map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
}

export function validarIdSesion(id) {
  if (!esEntero(id)) throw new ErrorUsuario('El ID de la sesión no es válido.', 400)
  return Number(id)
}

export function validarEdicionOpcional(valor) {
  if (valor === undefined || valor === null || valor === '') return null
  if (!esEntero(valor)) throw new ErrorUsuario('El ID de la edición no es válido.', 400)
  return Number(valor)
}

// Datos de una sesión (alta y edición). Devuelve los campos con el nombre del modelo.
export function validarDatosSesion(datos) {
  validarObjeto(datos)
  const errores = {}

  const nombre = limpiarTexto(datos.nombre)
  if (!nombre || Array.from(nombre).length > LIMITE_NOMBRE) {
    errores.nombre = `Ingrese el nombre de la sesión (hasta ${LIMITE_NOMBRE} caracteres).`
  }
  if (!esEntero(datos.ejeId)) errores.ejeId = 'Seleccione el eje temático.'
  if (!esEntero(datos.salaId)) errores.salaId = 'Seleccione la sala.'
  if (!PATRON_UUID.test(String(datos.moderadorId ?? ''))) {
    errores.moderadorId = 'Seleccione a la persona moderadora.'
  }
  if (!esFechaReal(datos.fecha)) errores.fecha = 'Ingrese una fecha válida (AAAA-MM-DD).'
  if (!PATRON_HORA.test(datos.horaInicio ?? '')) errores.horaInicio = 'Ingrese la hora de inicio (HH:MM).'
  if (!PATRON_HORA.test(datos.horaFin ?? '')) errores.horaFin = 'Ingrese la hora de fin (HH:MM).'
  if (!errores.horaInicio && !errores.horaFin && datos.horaInicio >= datos.horaFin) {
    errores.horaFin = 'La hora de fin debe ser posterior a la de inicio.'
  }

  if (Object.keys(errores).length) throw new ErrorUsuario('Revise los datos de la sesión.', 400, errores)

  return {
    name: nombre,
    thematicAxisId: Number(datos.ejeId),
    roomId: Number(datos.salaId),
    moderatorId: String(datos.moderadorId).toLowerCase(),
    date: datos.fecha,
    startTime: datos.horaInicio,
    endTime: datos.horaFin,
  }
}

// Códigos de los trabajos de una sesión, en el orden de exposición.
export function validarCodigosTrabajos(datos) {
  validarObjeto(datos)
  if (!Array.isArray(datos.trabajos) || datos.trabajos.some(codigo => typeof codigo !== 'string')) {
    throw new ErrorUsuario('Envíe «trabajos» como una lista de códigos.', 400)
  }
  const codigos = datos.trabajos.map(codigo => codigo.trim())
  if (codigos.some(codigo => !codigo || codigo.length > 20)) {
    throw new ErrorUsuario('Hay un código de trabajo no válido.', 400)
  }
  if (new Set(codigos).size !== codigos.length) {
    throw new ErrorUsuario('Un trabajo no puede repetirse en la sesión.', 400)
  }
  return codigos
}
