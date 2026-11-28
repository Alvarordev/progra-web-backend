import { consultarCumplimientoRevisores, consultarMetricas } from '../services/metricas.js'

export const obtenerMetricas = async (req, res, next) => {
  try {
    const data = await consultarMetricas(req.query)
    return res.json({ status: 'success', data })
  } catch (error) {
    return next(error)
  }
}

export const obtenerCumplimientoRevisores = async (req, res, next) => {
  try {
    const data = await consultarCumplimientoRevisores(req.query)
    return res.json({ status: 'success', data })
  } catch (error) {
    return next(error)
  }
}
