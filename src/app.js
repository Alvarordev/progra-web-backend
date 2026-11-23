import express from 'express'
import { healthRouter } from './routes/health.js'
import revisionBDRouter from './routes/revisionBD.js'

export const app = express()

// Permite leer el cuerpo JSON de las peticiones (POST/PUT)
app.use(express.json())

app.use('/api/health', healthRouter)
// HU5: revisión de trabajos y dictamen del comité
app.use('/api/hu5', revisionBDRouter)
