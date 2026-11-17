import { Router } from 'express'
import { isDatabaseAvailable } from '../services/health.js'

export const healthRouter = Router()

healthRouter.get('/', async (_request, response) => {
  if (await isDatabaseAvailable()) {
    return response.json({ status: 'ok', database: 'connected' })
  }

  return response.status(503).json({ status: 'unavailable', database: 'disconnected' })
})
