import { Router } from 'express'
import { autenticar, permitirRoles } from '../middleware/autenticacion.js'
import {
  actualizarRevisorAsignado,
  crearAsignacionesEnLote,
  crearAsignacionesTrabajo,
  eliminarAsignacionRevisor,
  enviarRecordatorioIndividual,
  enviarRecordatoriosMasivos,
  obtenerCandidatosAsignacion,
  obtenerHistorialAsignacionesTrabajo,
  obtenerRevisores,
  obtenerSeguimientoRevisiones,
  obtenerTrabajosRecibidos,
} from '../controllers/AsignacionRevisionController.js'

const router = Router()
const comite = permitirRoles('committee')

router.get('/trabajos-recibidos', autenticar, comite, obtenerTrabajosRecibidos)
router.get('/trabajos-recibidos/:trabajoId/historial-asignaciones', autenticar, comite, obtenerHistorialAsignacionesTrabajo)
router.post('/trabajos-recibidos/:trabajoId/asignaciones', autenticar, comite, crearAsignacionesTrabajo)

router.get('/asignaciones/candidatos', autenticar, comite, obtenerCandidatosAsignacion)
router.post('/asignaciones/lote', autenticar, comite, crearAsignacionesEnLote)
router.put('/asignaciones/:id/reasignar', autenticar, comite, actualizarRevisorAsignado)
router.delete('/asignaciones/:id', autenticar, comite, eliminarAsignacionRevisor)

router.get('/revisores', autenticar, comite, obtenerRevisores)

router.get('/seguimiento-revisiones', autenticar, comite, obtenerSeguimientoRevisiones)
router.post('/asignaciones/:id/recordatorios', autenticar, comite, enviarRecordatorioIndividual)
router.post('/asignaciones/recordatorios', autenticar, comite, enviarRecordatoriosMasivos)

export default router
