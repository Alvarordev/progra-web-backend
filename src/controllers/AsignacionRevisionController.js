import {
  ErrorNegocio,
  asignarRevisoresEnLote,
  asignarRevisoresTrabajo,
  listarCandidatosAsignacion,
  listarRevisores,
  listarSeguimientoRevisiones,
  listarTrabajosRecibidos,
  obtenerHistorialTrabajo,
  reasignarRevisor,
  registrarRecordatorioIndividual,
  registrarRecordatoriosPendientes,
  retirarRevisor,
} from '../services/asignacionesRevision.js'

function responderError(res, error, next) {
  if (error instanceof ErrorNegocio) {
    return res.status(error.codigo).json({
      status: 'error',
      mensaje: error.message,
      ...(error.detalles ? { detalles: error.detalles } : {}),
    })
  }
  return next(error)
}

export async function obtenerTrabajosRecibidos(req, res, next) {
  try {
    const data = await listarTrabajosRecibidos(req.query)
    return res.status(200).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function obtenerCandidatosAsignacion(req, res, next) {
  try {
    const data = await listarCandidatosAsignacion(req.query)
    return res.status(200).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function crearAsignacionesTrabajo(req, res, next) {
  try {
    const data = await asignarRevisoresTrabajo({
      identificadorTrabajo: req.params.trabajoId,
      datos: req.body,
      usuarioId: res.locals.usuario.id,
    })
    return res.status(201).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function crearAsignacionesEnLote(req, res, next) {
  try {
    const data = await asignarRevisoresEnLote({
      datos: req.body,
      usuarioId: res.locals.usuario.id,
    })
    return res.status(201).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function obtenerRevisores(req, res, next) {
  try {
    const data = await listarRevisores(req.query)
    return res.status(200).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function actualizarRevisorAsignado(req, res, next) {
  try {
    const data = await reasignarRevisor({
      asignacionId: req.params.id,
      datos: req.body,
      usuarioId: res.locals.usuario.id,
    })
    return res.status(200).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function eliminarAsignacionRevisor(req, res, next) {
  try {
    const motivo = req.body?.motivo ?? req.query?.motivo ?? ''
    const data = await retirarRevisor({
      asignacionId: req.params.id,
      motivo,
      usuarioId: res.locals.usuario.id,
    })
    return res.status(200).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function obtenerHistorialAsignacionesTrabajo(req, res, next) {
  try {
    const data = await obtenerHistorialTrabajo(req.params.trabajoId)
    return res.status(200).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function obtenerSeguimientoRevisiones(req, res, next) {
  try {
    const data = await listarSeguimientoRevisiones(req.query)
    return res.status(200).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function enviarRecordatorioIndividual(req, res, next) {
  try {
    const data = await registrarRecordatorioIndividual({
      asignacionId: req.params.id,
      usuarioId: res.locals.usuario.id,
    })
    return res.status(201).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}

export async function enviarRecordatoriosMasivos(req, res, next) {
  try {
    const data = await registrarRecordatoriosPendientes({
      datos: req.body,
      usuarioId: res.locals.usuario.id,
    })
    return res.status(201).json({ status: 'success', data })
  } catch (error) {
    return responderError(res, error, next)
  }
}
