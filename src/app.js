import express from 'express'
import { healthRouter } from './routes/health.js'
import revisionesRouter from './routes/revisiones.js'
import asignacionesRouter from './routes/asignaciones.js'

export const app = express()

// Permite leer el cuerpo JSON de las peticiones (POST/PUT/DELETE)
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api', revisionesRouter)
app.use('/api', asignacionesRouter)

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res
      .status(400)
      .json({ status: 'error', mensaje: 'El cuerpo JSON de la petición no es válido.' })
  }

  console.error('Error inesperado en la API:', error)
  return res
    .status(500)
    .json({ status: 'error', mensaje: 'Ocurrió un error interno en el servidor.' })
})
