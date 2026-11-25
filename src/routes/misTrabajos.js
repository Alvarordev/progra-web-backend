import { Router } from 'express'
import { autenticar, permitirRoles } from '../middleware/autenticacion.js'
import { crearTrabajo, opciones } from '../controllers/TrabajoAutorController.js'

// Rutas de la HU3 (nuevo trabajo). Todas empiezan con /api/mis-trabajos.
const router = Router()

// Primero se revisa el correo y la contraseña, y luego que la cuenta sea de autor.
router.use(autenticar, permitirRoles('author', 'both'))

router.get('/opciones', opciones)
router.post('/', crearTrabajo)

export default router
