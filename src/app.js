import express from 'express'
import { healthRouter } from './routes/health.js'
import revisionesRouter from './routes/revisiones.js'
import misTrabajosRouter from './routes/misTrabajos.js'

export const app = express()

// Rutas
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/mis-trabajos', misTrabajosRouter)
app.use('/api', revisionesRouter)
