#!/bin/sh
# Arranque en producción: migra, carga los datos de ejemplo (idempotente) y levanta la API.
# Las variables llegan del entorno del contenedor; no se necesita un archivo .env.
set -e

sequelize="node node_modules/sequelize-cli/lib/sequelize"

$sequelize db:migrate --options-path .sequelizerc.cjs

if [ "${RUN_SEEDS:-true}" = "true" ]; then
  $sequelize db:seed:all --options-path .sequelizerc.cjs
fi

exec node src/server.js
