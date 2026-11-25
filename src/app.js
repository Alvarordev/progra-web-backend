import express from 'express'
import { healthRouter } from './routes/health.js'
import revisionesRouter from './routes/revisiones.js'

export const app = express()

// Permite leer el cuerpo JSON de las peticiones (POST/PUT)
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api', revisionesRouter)
