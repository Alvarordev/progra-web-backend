// Cálculos puros (sin base de datos) del programa del congreso.

export const MINUTOS_POR_TRABAJO = 20

export const aMinutos = hora => {
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
}

export const aHora = minutos =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`

// La base devuelve TIME como HH:MM:SS; la API publica HH:MM.
export const recortarHora = hora => String(hora).slice(0, 5)

export const capacidadSesion = ({ horaInicio, horaFin }) =>
  Math.floor((aMinutos(horaFin) - aMinutos(horaInicio)) / MINUTOS_POR_TRABAJO)

export function horarioTrabajo(sesion, indice) {
  const inicio = aMinutos(sesion.horaInicio) + indice * MINUTOS_POR_TRABAJO
  return { horaInicio: aHora(inicio), horaFin: aHora(inicio + MINUTOS_POR_TRABAJO) }
}

const seSolapan = (a, b) =>
  a.fecha === b.fecha &&
  aMinutos(a.horaInicio) < aMinutos(b.horaFin) &&
  aMinutos(b.horaInicio) < aMinutos(a.horaFin)

function rangoComun(a, b) {
  return {
    horaInicio: aHora(Math.max(aMinutos(a.horaInicio), aMinutos(b.horaInicio))),
    horaFin: aHora(Math.min(aMinutos(a.horaFin), aMinutos(b.horaFin))),
  }
}

// Una sala no puede alojar dos sesiones a la vez ni una persona moderar dos a la vez.
export function detectarConflictos(sesiones) {
  const conflictos = []
  sesiones.forEach((primera, indice) => {
    for (const segunda of sesiones.slice(indice + 1)) {
      if (!seSolapan(primera, segunda)) continue
      const rango = { fecha: primera.fecha, ...rangoComun(primera, segunda) }
      if (primera.salaId === segunda.salaId) {
        conflictos.push({
          tipo: 'sala',
          sesionIds: [primera.id, segunda.id],
          sala: primera.sala,
          ...rango,
          mensaje: `«${primera.nombre}» y «${segunda.nombre}» usan la sala ${primera.sala} entre las ${rango.horaInicio} y las ${rango.horaFin}.`,
        })
      }
      if (primera.moderadorId && primera.moderadorId === segunda.moderadorId) {
        conflictos.push({
          tipo: 'moderador',
          sesionIds: [primera.id, segunda.id],
          moderador: primera.moderador,
          ...rango,
          mensaje: `${primera.moderador} modera «${primera.nombre}» y «${segunda.nombre}» entre las ${rango.horaInicio} y las ${rango.horaFin}.`,
        })
      }
    }
  })
  return conflictos
}

// Conflictos que involucran a una sesión concreta dentro de un conjunto de sesiones.
export const conflictosDeSesion = (sesiones, sesionId) =>
  detectarConflictos(sesiones).filter(conflicto => conflicto.sesionIds.includes(sesionId))

// JSONB no conserva el orden de las claves, así que la comparación las ordena.
const normalizar = valor => {
  if (Array.isArray(valor)) return valor.map(normalizar)
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map(clave => [clave, normalizar(valor[clave])])
    )
  }
  return valor
}

// Compara lo que ve el público con el borrador actual (sin considerar la fecha de publicación).
export const hayCambiosSinPublicar = (sesionesPublicadas, sesionesActuales) =>
  JSON.stringify(normalizar(sesionesPublicadas ?? [])) !==
  JSON.stringify(normalizar(sesionesActuales))
