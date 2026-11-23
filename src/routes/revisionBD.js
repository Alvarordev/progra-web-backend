import { Router } from 'express'
import {
  consolidado,
  decisiones,
  guardarDecision,
  guardarRevision,
  revisiones,
  trabajos_revisiones,
} from '../controllers/RevisionBDController.js'

const router = Router()

// Consultas
router.get('/revisiones', revisiones)
router.get('/trabajos-revisiones', trabajos_revisiones)
router.get('/decisiones', decisiones)
router.get('/consolidado/:trabajoId', consolidado)

// Escritura
router.put('/revisiones/:id', guardarRevision)
router.put('/decisiones/:trabajoId', guardarDecision)

export default router
