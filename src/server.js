import express from 'express'
import { sequelize } from './database.js'

const app = express()
const host = '127.0.0.1'
const port = Number(process.env.PORT ?? 3000)

app.get('/api/health', async (_request, response) => {
  try {
    await sequelize.authenticate()
    response.json({ status: 'ok', database: 'connected' })
  } catch {
    response.status(503).json({ status: 'unavailable', database: 'disconnected' })
  }
})

try {
  await sequelize.authenticate()
  app.listen(port, host, error => {
    if (error) {
      console.error('No se pudo iniciar el servidor:', error.message)
      process.exitCode = 1
      void sequelize.close()
      return
    }

    console.log(`API disponible en http://${host}:${port}`)
  })
} catch (error) {
  console.error('No se pudo conectar a PostgreSQL:', error.message)
  await sequelize.close()
  process.exitCode = 1
}
