import { Router } from 'express'
import { autenticar, permitirRoles } from '../middleware/accesoHu5.js'
import {
  consolidado,
  decisiones,
  guardarDecision,
  guardarRevision,
  revisiones,
  trabajos_revisiones,
} from '../controllers/RevisionBDController.js'

const router = Router()
const revisar = permitirRoles('reviewer', 'both')
const comite = permitirRoles('committee')

router.use(autenticar)
router.get('/revisiones', permitirRoles('reviewer', 'both', 'committee'), revisiones)
router.get('/trabajos-revisiones', comite, trabajos_revisiones)
router.get('/decisiones', permitirRoles('author', 'both', 'committee'), decisiones)
router.get('/consolidado/:trabajoId', comite, consolidado)
router.put('/revisiones/:id', revisar, guardarRevision)
router.put('/decisiones/:trabajoId', comite, guardarDecision)

export default router
