import db from '../db/models/index.cjs'

// HU5 - Parte revisor: revisiones de los trabajos indicados (por id)
export const revisiones = async (req, res) => {
  console.log('/revisiones invocado !')
  const revisiones = await db.revision.findAll({
    where: {
      trabajoId: [1, 2, 3],
    },
    include: ['trabajo', 'revisor'],
  })
  return res.json({
    status: 'success',
    data: revisiones,
  })
}

// HU5 - Parte comité: cada trabajo con sus revisiones y su decisión (un JOIN)
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
      console.log('  ', r.puntaje, ' - ', r.recomendacion)
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
