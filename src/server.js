import { app } from './app.js'
import { sequelize } from './db/sequelize.js'

// En desarrollo solo escucha en local; en un contenedor se define HOST=0.0.0.0
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT ?? 3000)

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
