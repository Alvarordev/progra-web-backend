const conexion = {
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  dialect: 'postgres',
  logging: false,
  seederStorage: 'sequelize',
};

module.exports = {
  development: conexion,
  test: conexion,
  production: conexion,
};
