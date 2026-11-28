// Cálculos puros (sin base de datos) compartidos por los servicios de métricas y de gestión de usuarios.

const MS_POR_DIA = 24 * 60 * 60 * 1000

const estadosTrabajo = [
  ['accepted', 'Aceptado'],
  ['rejected', 'Rechazado'],
  ['under_review', 'En revisión'],
  ['submitted', 'Enviado'],
  ['draft', 'Borrador'],
]

export const redondear = (valor, decimales = 0) => {
  const factor = 10 ** decimales
  return Math.round(valor * factor) / factor
}

const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0)

// Una revisión vence al terminar el día límite (hora de Lima) si todavía no fue enviada.
export function estaVencida(fechaLimite, entregada, ahora = new Date()) {
  return !entregada && new Date(`${fechaLimite}T23:59:59-05:00`) < ahora
}

const estaEntregada = asignacion => asignacion.review?.status === 'submitted'

export function diasDeEntrega(asignacion) {
  const enviada = asignacion.review?.submittedAt
  if (!estaEntregada(asignacion) || !enviada) return null
  return Math.max(0, (new Date(enviada) - new Date(asignacion.createdAt)) / MS_POR_DIA)
}

const promedio = valores =>
  valores.length ? valores.reduce((suma, valor) => suma + valor, 0) / valores.length : null

export function calcularMetricas({ trabajos, ejes, asignaciones, ahora = new Date() }) {
  const contar = estado => trabajos.filter(trabajo => trabajo.status === estado).length
  const borradores = contar('draft')
  const aceptados = contar('accepted')
  const rechazados = contar('rejected')
  const evaluados = aceptados + rechazados
  const pendientes = asignaciones.filter(
    asignacion => !estaEntregada(asignacion) && !asignacion.reviewer?.blocked
  )

  return {
    indicadores: {
      trabajosRecibidos: trabajos.length,
      enviados: trabajos.length - borradores,
      borradores,
      aceptados,
      rechazados,
      evaluados,
      tasaAceptacion: porcentaje(aceptados, evaluados),
      revisionesPendientes: pendientes.length,
      revisionesVencidas: pendientes.filter(asignacion =>
        estaVencida(asignacion.dueDate, false, ahora)
      ).length,
    },
    trabajosPorEje: ejes.map(eje => ({
      eje: eje.name,
      total: trabajos.filter(trabajo => trabajo.thematicAxisId === eje.id).length,
    })),
    trabajosPorEstado: estadosTrabajo.map(([estado, etiqueta]) => ({
      estado: etiqueta,
      total: contar(estado),
    })),
  }
}

export function calcularCumplimiento({ asignaciones, totalRevisores, ahora = new Date() }) {
  const porRevisor = new Map()
  for (const asignacion of asignaciones) {
    const fila = porRevisor.get(asignacion.reviewerId) ?? {
      id: asignacion.reviewerId,
      nombre: asignacion.reviewer.fullName,
      institucion: asignacion.reviewer.institution,
      asignadas: 0,
      entregadas: 0,
      vencidas: 0,
      tiempos: [],
    }
    const entregada = estaEntregada(asignacion)
    fila.asignadas += 1
    if (entregada) fila.entregadas += 1
    if (estaVencida(asignacion.dueDate, entregada, ahora)) fila.vencidas += 1
    const dias = diasDeEntrega(asignacion)
    if (dias !== null) fila.tiempos.push(dias)
    porRevisor.set(asignacion.reviewerId, fila)
  }

  const revisores = [...porRevisor.values()]
    .map(({ tiempos, ...fila }) => ({
      ...fila,
      cumplimiento: porcentaje(fila.entregadas, fila.asignadas),
      tiempo: tiempos.length ? redondear(promedio(tiempos), 1) : null,
    }))
    .sort(
      (a, b) =>
        b.entregadas / b.asignadas - a.entregadas / a.asignadas ||
        (a.tiempo ?? Infinity) - (b.tiempo ?? Infinity) ||
        a.nombre.localeCompare(b.nombre, 'es')
    )

  const asignadas = asignaciones.length
  const entregadas = revisores.reduce((suma, revisor) => suma + revisor.entregadas, 0)
  const tiempos = asignaciones.map(diasDeEntrega).filter(dias => dias !== null)

  return {
    resumen: {
      asignadas,
      entregadas,
      cumplimientoGlobal: porcentaje(entregadas, asignadas),
      tiempoPromedioDias: tiempos.length ? redondear(promedio(tiempos), 1) : null,
      revisoresConVencidas: revisores.filter(revisor => revisor.vencidas > 0).length,
      totalRevisores,
    },
    revisores,
  }
}

const plural = (cantidad, singular, plural) => `${cantidad} ${cantidad === 1 ? singular : plural}`

// Columna «Trabajos / Revisiones» de la gestión de usuarios.
export function resumirActividad(rol, { trabajos, revisiones, vencidas }) {
  const partes = []
  if (rol === 'author' || rol === 'both') partes.push(plural(trabajos, 'trabajo', 'trabajos'))
  if (rol === 'reviewer' || rol === 'both') {
    const texto = plural(revisiones, 'revisión', 'revisiones')
    partes.push(vencidas ? `${texto} · ${plural(vencidas, 'vencida', 'vencidas')}` : texto)
  }
  return partes.length ? partes.join(' · ') : '—'
}

export function contarActividad(usuarioId, trabajosPorAutor, asignaciones, ahora = new Date()) {
  const propias = asignaciones.filter(asignacion => asignacion.reviewerId === usuarioId)
  return {
    trabajos: trabajosPorAutor.filter(trabajo => trabajo.ownerId === usuarioId).length,
    revisiones: propias.length,
    vencidas: propias.filter(asignacion =>
      estaVencida(asignacion.dueDate, estaEntregada(asignacion), ahora)
    ).length,
  }
}
