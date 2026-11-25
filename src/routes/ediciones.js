import { Router } from 'express'
import { autenticar, permitirRoles } from '../middleware/autenticacion.js'
import {
  autenticarConfiguracion, cerrarSesionComite, consultarSesionComite, iniciarSesionComite,
} from '../middleware/sesionComite.js'
import {
  actualizarElemento, crearElemento, detalleEdicion, eliminarElemento,
  guardarEdicion, listaCatalogo, listaEdiciones,
} from '../controllers/EdicionController.js'

const router = Router()
const comite = permitirRoles('committee')
const administrar = [autenticarConfiguracion, comite]

router.get('/ediciones', listaEdiciones)
router.get('/ediciones/:edicionId', detalleEdicion)
router.patch('/ediciones/:edicionId', administrar, guardarEdicion)

for (const catalogo of ['ejes_tematicos', 'tipos_trabajo', 'criterios']) {
  const ruta = `/ediciones/:edicionId/${catalogo}`
  router.get(ruta, listaCatalogo(catalogo))
  router.post(ruta, administrar, crearElemento(catalogo))
  router.put(`${ruta}/:id`, administrar, actualizarElemento(catalogo))
  router.delete(`${ruta}/:id`, administrar, eliminarElemento(catalogo))
}

router.post('/usuarios/sesiones', autenticar, comite, iniciarSesionComite)
router.get('/usuarios/sesiones', consultarSesionComite)
router.delete('/usuarios/sesiones', cerrarSesionComite)

export default router
