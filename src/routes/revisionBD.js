import { Router } from 'express'
import {
  decisiones,
  revisiones,
  trabajos_revisiones,
} from '../controllers/RevisionBDController.js'

const router = Router()

router.get('/revisiones', revisiones)
router.get('/trabajos-revisiones', trabajos_revisiones)
router.get('/decisiones', decisiones)

export default router
