import { Router } from 'express'
import { autenticar, permitirRoles } from '../middleware/autenticacion.js'
import {
  actualizarRevisorAsignado,
  crearAsignacionesEnLote,
  eliminarAsignacionRevisor,
  enviarRecordatorioIndividual,
  enviarRecordatoriosMasivos,
  obtenerCandidatosAsignacion,
  obtenerRevisores,
  obtenerSeguimientoRevisiones,
} from '../controllers/AsignacionRevisionController.js'

const router = Router()
const comite = permitirRoles('committee')

router.get('/asignaciones_revision', autenticar, comite, obtenerSeguimientoRevisiones)
router.get('/asignaciones_revision/usuarios', autenticar, comite, obtenerCandidatosAsignacion)
router.post('/asignaciones_revision', autenticar, comite, crearAsignacionesEnLote)
router.put('/asignaciones_revision/:id', autenticar, comite, actualizarRevisorAsignado)
router.delete('/asignaciones_revision/:id', autenticar, comite, eliminarAsignacionRevisor)
router.post('/asignaciones_revision/:id/recordatorios_revision', autenticar, comite, enviarRecordatorioIndividual)
router.post('/recordatorios_revision', autenticar, comite, enviarRecordatoriosMasivos)
router.get('/usuarios', autenticar, comite, obtenerRevisores)

export default router
