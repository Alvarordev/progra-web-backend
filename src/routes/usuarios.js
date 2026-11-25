import { Router } from 'express';
import { autenticar, permitirRoles } from '../middleware/autenticacion.js';
import * as usuarios from '../controllers/UsuarioController.js';
import * as recuperaciones from '../controllers/RecuperacionController.js';

const router = Router();
const participante = [autenticar, permitirRoles('author', 'reviewer', 'both')];

router.post('/usuarios', usuarios.registrarUsuario);
router.post('/usuarios/sesiones', usuarios.iniciarSesion);
router.get('/usuarios/sesiones', autenticar, usuarios.consultarSesion);
router.delete('/usuarios/sesiones', usuarios.cerrarSesion);
router.get('/usuarios/perfil', participante, usuarios.consultarPerfil);
router.patch('/usuarios/perfil', participante, usuarios.actualizarPerfil);
router.put('/usuarios/contrasena', autenticar, usuarios.cambiarContrasena);
router.get('/usuarios/asignaciones', autenticar, permitirRoles('reviewer', 'both'), usuarios.listarAsignaciones);
router.get('/usuarios/trabajos/:codigo/acceso', autenticar, permitirRoles('author', 'both'), usuarios.consultarAccesoTrabajo);
router.post('/usuarios/recuperaciones', recuperaciones.solicitarRecuperacion);
router.post('/usuarios/recuperaciones/verificacion', recuperaciones.verificarCodigo);
router.post('/usuarios/recuperaciones/contrasena', recuperaciones.restablecerContrasena);

export default router;
