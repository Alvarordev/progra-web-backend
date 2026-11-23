import db from '../db/models/index.cjs'

const RECOMENDACIONES = ['aceptar', 'observaciones', 'rechazar']
const RESULTADOS = ['aceptar', 'rechazar']

// Promedio ponderado de las notas de una revisión, redondeado a un decimal
function notaPonderada(notas) {
  const conPuntaje = notas.filter(n => n.puntaje !== null && n.criterio)
  const pesoTotal = conPuntaje.reduce((total, n) => total + n.criterio.peso, 0)
  if (pesoTotal === 0) {
    return null
  }
  const suma = conPuntaje.reduce((total, n) => total + n.puntaje * n.criterio.peso, 0)
  return Math.round((suma * 10) / pesoTotal) / 10
}

// ---------- Consultas (GET) ----------

// HU5 - Parte revisor: revisiones con su trabajo, revisor y notas por criterio
export const revisiones = async (req, res) => {
  console.log('/revisiones invocado !')
  const revisiones = await db.revision.findAll({
    order: [['id', 'ASC']],
    include: [
      'trabajo',
      'revisor',
      { model: db.revisionCriterio, as: 'criterios', include: ['criterio'] },
    ],
  })
  return res.json({
    status: 'success',
    data: revisiones,
  })
}

// HU5 - Cada trabajo con su autor, sus revisiones y su decisión (un JOIN)
export const trabajos_revisiones = async (req, res) => {
  console.log('/trabajos-revisiones invocado !')
  const trabajos = await db.trabajo.findAll({
    order: [['codigo', 'ASC']],
    include: ['autor', 'revisiones', 'decision'],
  })

  trabajos.forEach(t => {
    console.log(t.get('codigo'), t.get('titulo'))
    const revisiones = t.get('revisiones')
    revisiones.forEach(r => {
      console.log('  ', r.estado, ' - ', r.recomendacion)
    })
  })

  return res.json({
    status: 'success',
    data: trabajos,
  })
}

// HU5 - Parte comité: decisiones finales con su trabajo
export const decisiones = async (req, res) => {
  console.log('/decisiones invocado !')
  const decisiones = await db.decision.findAll({
    include: ['trabajo'],
  })
  return res.json({
    status: 'success',
    data: decisiones,
  })
}

// HU5 - Parte comité: consolidado de las revisiones de un trabajo
export const consolidado = async (req, res) => {
  const { trabajoId } = req.params
  console.log(`/consolidado/${trabajoId} invocado !`)
  const trabajo = await db.trabajo.findByPk(trabajoId, {
    include: [
      'decision',
      {
        model: db.revision,
        as: 'revisiones',
        include: [
          'revisor',
          { model: db.revisionCriterio, as: 'criterios', include: ['criterio'] },
        ],
      },
    ],
  })
  if (!trabajo) {
    return res.status(404).json({ status: 'error', mensaje: 'El trabajo no existe.' })
  }

  // Solo cuentan las revisiones enviadas; las demás se muestran como pendientes
  const filas = trabajo.revisiones.map(r => {
    const enviada = r.estado === 'enviada'
    return {
      revisionId: r.id,
      revisor: r.revisor?.nombre,
      estado: r.estado,
      recomendacion: enviada ? r.recomendacion : null,
      notaPonderada: enviada ? notaPonderada(r.criterios) : null,
      comentarioAutor: enviada ? r.comentarioAutor : '',
      comentarioComite: enviada ? r.comentarioComite : '',
    }
  })
  const notas = filas.map(f => f.notaPonderada).filter(n => n !== null)
  const promedioGeneral = notas.length
    ? Math.round((notas.reduce((a, b) => a + b, 0) * 10) / notas.length) / 10
    : null

  return res.json({
    status: 'success',
    data: {
      trabajo: { id: trabajo.id, codigo: trabajo.codigo, titulo: trabajo.titulo },
      revisiones: filas,
      resumen: {
        total: filas.length,
        enviadas: notas.length,
        promedioGeneral,
        recomiendanAceptar: filas.filter(f => f.recomendacion === 'aceptar').length,
      },
      decision: trabajo.decision,
    },
  })
}

// ---------- Escritura (PUT) ----------

// HU5 - Parte revisor: guardar borrador o enviar la evaluación con sus notas
export const guardarRevision = async (req, res) => {
  const { id } = req.params
  const {
    estado = 'borrador',
    recomendacion = '',
    comentarioAutor = '',
    comentarioComite = '',
    criterios = [],
  } = req.body ?? {}

  const revision = await db.revision.findByPk(id)
  if (!revision) {
    return res.status(404).json({ status: 'error', mensaje: 'La revisión no existe.' })
  }
  if (revision.estado === 'enviada') {
    return res
      .status(409)
      .json({ status: 'error', mensaje: 'La evaluación ya fue enviada y no admite cambios.' })
  }
  if (!['borrador', 'enviada'].includes(estado) || !Array.isArray(criterios)) {
    return res.status(400).json({ status: 'error', mensaje: 'Datos no válidos.' })
  }

  const puntajeValido = p => p === null || (Number.isInteger(p) && p >= 0 && p <= 20)
  if (!criterios.every(c => puntajeValido(c.puntaje ?? null))) {
    return res
      .status(400)
      .json({ status: 'error', mensaje: 'Los puntajes deben ser enteros de 0 a 20.' })
  }

  // Para enviar, todos los criterios deben tener nota y comentario
  if (estado === 'enviada') {
    const totalCriterios = await db.criterio.count()
    const completa =
      criterios.length === totalCriterios &&
      criterios.every(c => Number.isInteger(c.puntaje) && c.comentario?.trim()) &&
      RECOMENDACIONES.includes(recomendacion) &&
      comentarioAutor.trim()
    if (!completa) {
      return res.status(400).json({
        status: 'error',
        mensaje:
          'Para enviar, califique y comente todos los criterios, elija una recomendación y escriba el comentario al autor.',
      })
    }
  }

  // La revisión y sus notas se guardan juntas (transacción)
  await db.sequelize.transaction(async transaction => {
    await revision.update(
      { estado, recomendacion, comentarioAutor, comentarioComite },
      { transaction }
    )
    await db.revisionCriterio.destroy({ where: { revisionId: revision.id }, transaction })
    await db.revisionCriterio.bulkCreate(
      criterios.map(c => ({
        revisionId: revision.id,
        criterioId: c.criterioId,
        puntaje: c.puntaje ?? null,
        comentario: c.comentario ?? '',
      })),
      { transaction }
    )
  })

  const actualizada = await db.revision.findByPk(id, {
    include: [{ model: db.revisionCriterio, as: 'criterios', include: ['criterio'] }],
  })
  return res.json({ status: 'success', data: actualizada })
}

// HU5 - Parte comité: guardar o publicar la decisión final de un trabajo
export const guardarDecision = async (req, res) => {
  const { trabajoId } = req.params
  const { resultado, retroalimentacion = '', estado = 'borrador' } = req.body ?? {}

  const trabajo = await db.trabajo.findByPk(trabajoId, { include: ['decision'] })
  if (!trabajo) {
    return res.status(404).json({ status: 'error', mensaje: 'El trabajo no existe.' })
  }
  if (!RESULTADOS.includes(resultado) || !['borrador', 'publicada'].includes(estado)) {
    return res.status(400).json({ status: 'error', mensaje: 'Datos no válidos.' })
  }
  if (trabajo.decision?.estado === 'publicada') {
    return res.status(409).json({ status: 'error', mensaje: 'La decisión ya fue publicada.' })
  }

  const datos = { trabajoId: trabajo.id, resultado, retroalimentacion, estado }
  const existente = trabajo.decision
  const decision = existente ? await existente.update(datos) : await db.decision.create(datos)
  return res.status(existente ? 200 : 201).json({ status: 'success', data: decision })
}
