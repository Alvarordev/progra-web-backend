import { Router } from 'express'
import { autenticar, permitirRoles } from '../middleware/autenticacion.js'
import {
  actualizarSesion,
  asignarTrabajos,
  crearSesion,
  eliminarSesion,
  obtenerGestionPrograma,
  obtenerMiPresentacion,
  obtenerProgramaPublico,
  publicarPrograma,
} from '../controllers/ProgramaController.js'

const router = Router()
const comite = [autenticar, permitirRoles('committee')]
const autor = [autenticar, permitirRoles('author', 'both')]

// Versión publicada, visible sin iniciar sesión
router.get('/programa', obtenerProgramaPublico)

// Borrador y publicación (comité)
router.get('/programa/gestion', comite, obtenerGestionPrograma)
router.post('/programa/sesiones', comite, crearSesion)
router.put('/programa/sesiones/:id', comite, actualizarSesion)
router.delete('/programa/sesiones/:id', comite, eliminarSesion)
router.put('/programa/sesiones/:id/trabajos', comite, asignarTrabajos)
router.post('/programa/publicacion', comite, publicarPrograma)

// Exposiciones del autor
router.get('/programa/mi_presentacion', autor, obtenerMiPresentacion)

export default router
