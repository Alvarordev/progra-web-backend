import express from 'express'
import { cors } from './middleware/cors.js'
import { healthRouter } from './routes/health.js'
import revisionesRouter from './routes/revisiones.js'
import asignacionesRouter from './routes/asignaciones.js'
import trabajosRouter from './routes/trabajos.js'
import edicionesRouter from './routes/ediciones.js'
import usuariosRouter from './routes/usuarios.js'
import gestionUsuariosRouter from './routes/gestionUsuarios.js'
import metricasRouter from './routes/metricas.js'
import programaRouter from './routes/programa.js'
import { sesion } from './middleware/sesion.js'
import { ErrorUsuario } from './services/validacionesUsuario.js'

export const app = express()

// Detrás de un proxy (Traefik, Vercel) la IP y el protocolo reales llegan en X-Forwarded-*;
// sin esto la cookie de sesión «secure» no se emitiría. TRUST_PROXY=1 confía en un proxy.
if (process.env.TRUST_PROXY) {
  const saltos = Number(process.env.TRUST_PROXY)
  app.set('trust proxy', Number.isNaN(saltos) ? process.env.TRUST_PROXY : saltos)
}

app.use('/api', cors)

app.use(express.json({ limit: '100kb' }))
app.use('/api', sesion)

app.use('/api/health', healthRouter)
app.use('/api', usuariosRouter)
app.use('/api', revisionesRouter)
app.use('/api', asignacionesRouter)
app.use('/api', trabajosRouter)
app.use('/api', edicionesRouter)
app.use('/api', gestionUsuariosRouter)
app.use('/api', metricasRouter)
app.use('/api', programaRouter)

app.use((error, _req, res, _next) => {
  if (error instanceof ErrorUsuario) {
    return res.status(error.codigo).json({ status: 'error', mensaje: error.message, errores: error.errores })
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return res
      .status(400)
      .json({ status: 'error', mensaje: 'El cuerpo JSON de la petición no es válido.' })
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ status: 'error', mensaje: 'El cuerpo JSON supera el tamaño permitido.' })
  }

  console.error('Error inesperado en la API:', error.message)
  return res
    .status(500)
    .json({ status: 'error', mensaje: 'Ocurrió un error interno en el servidor.' })
})
