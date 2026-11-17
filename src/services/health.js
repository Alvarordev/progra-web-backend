import { sequelize } from '../db/sequelize.js'

export async function isDatabaseAvailable() {
  try {
    await sequelize.authenticate()
    return true
  } catch {
    return false
  }
}
