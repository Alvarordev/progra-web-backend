import { Sequelize } from 'sequelize'

const { DB_HOST, DB_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = process.env

export const sequelize = new Sequelize(POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, {
  dialect: 'postgres',
  host: DB_HOST,
  port: Number(DB_PORT),
  logging: false,
  define: { underscored: true },
})
