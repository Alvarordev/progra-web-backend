import { Router } from 'express'
import { autenticar, permitirRoles } from '../middleware/autenticacion.js'
import {
  obtenerCumplimientoRevisores,
  obtenerMetricas,
} from '../controllers/MetricasController.js'

const router = Router()
const comite = [autenticar, permitirRoles('committee')]

router.get('/metricas', comite, obtenerMetricas)
router.get('/metricas/cumplimiento_revisores', comite, obtenerCumplimientoRevisores)

export default router
