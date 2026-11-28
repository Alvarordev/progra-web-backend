import { Router } from 'express'
import { autenticar, permitirRoles } from '../middleware/autenticacion.js'
import {
  actualizarUsuario,
  bloquearUsuario,
  invitarUsuario,
  listarUsuarios,
  reactivarUsuario,
} from '../controllers/GestionUsuarioController.js'

const router = Router()
const comite = [autenticar, permitirRoles('committee')]

router.get('/gestion_usuarios', comite, listarUsuarios)
router.post('/gestion_usuarios', comite, invitarUsuario)
router.put('/gestion_usuarios/:id', comite, actualizarUsuario)
router.put('/gestion_usuarios/:id/bloqueo', comite, bloquearUsuario)
router.delete('/gestion_usuarios/:id/bloqueo', comite, reactivarUsuario)

export default router
