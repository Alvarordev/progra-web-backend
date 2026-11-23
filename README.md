# Backend del Congreso Académico Estudiantil

API local en Node.js y Express para el proyecto `progra-web-grp-1`, con Sequelize y PostgreSQL.

## Desarrollo local

Necesitas Git, Node.js 22.13 o superior, npm y Docker con el complemento Compose. Inicia Docker antes de ejecutar los comandos.

```bash
git clone https://github.com/Alvarordev/progra-web-backend.git
cd progra-web-backend
cp env.local .env
npm ci
docker compose up -d --wait
npm run dev
```

Edita `.env` antes de levantar los servicios si necesitas cambiar los valores de ejemplo. Git ignora este archivo.

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto local de la API. Por defecto, `3000`. |
| `DB_HOST` | Host que usa la API para conectarse a PostgreSQL. Usa `127.0.0.1` con el Compose incluido. |
| `DB_PORT` | Puerto local publicado por Compose. Por defecto, `5433`. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Nombre de la base, usuario y contraseña de desarrollo. |

Si cambias `DB_PORT` después de levantar PostgreSQL, vuelve a ejecutar `docker compose up -d --wait`.

`npm run dev` usa el modo de observación de Node.js para reiniciar la API cuando cambia el código que carga. Si editas `.env`, detén y vuelve a ejecutar el comando. Usa `npm start` para iniciar el servidor sin reinicio automático.

## Verificar la conexión

```bash
curl -i http://127.0.0.1:3000/api/health
```

La ruta devuelve HTTP 200 y `{"status":"ok","database":"connected"}` cuando la consulta de Sequelize funciona. Si PostgreSQL deja de responder con la API en ejecución, devuelve HTTP 503. Si la conexión inicial falla, la API termina con un error.

Para detener el entorno, presiona `Ctrl+C` en la terminal de la API y ejecuta `docker compose down` desde la raíz del repositorio. El volumen conserva los datos entre arranques. PostgreSQL usa las credenciales y el nombre de la base de `.env` al inicializar el volumen por primera vez.

## Estructura del backend

```text
src/
├── app.js              # Configuración de Express y montaje de rutas
├── server.js           # Verificación de la conexión y arranque de la API
├── routes/             # Rutas de Express y respuestas HTTP
├── services/           # Operaciones que ejecutan las rutas
└── db/                 # Conexión a PostgreSQL con Sequelize
```

El proyecto usa módulos ECMAScript (ESM) con `"type": "module"` en `package.json`. Usa `import` y `export` en los archivos `.js` e incluye la extensión en los imports relativos. La conexión y los futuros modelos de Sequelize pueden usar ESM. Si se incorpora una herramienta que exige CommonJS para su configuración, se puede usar `.cjs` para ese archivo específico.

## Integración con el frontend

El frontend usa React y Vite. Los repositorios de `src/core/utils/repositories.js` exponen `get()`, `save()` y `remove()` asíncronos. Esos repositorios son el punto de integración para adoptar las rutas de la API a medida que se implementan. En esta etapa la API ofrece la ruta de diagnóstico y los datos del congreso siguen en el almacenamiento del navegador.

## Base de datos con Sequelize CLI (HU5)

Las tablas se crean con migraciones de `sequelize-cli`, como en los laboratorios del curso. Los archivos de Sequelize usan `.cjs` porque la herramienta trabaja con CommonJS. Con PostgreSQL en ejecución, ya sea el instalado en Windows (ajusta `DB_PORT`, `POSTGRES_USER` y `POSTGRES_PASSWORD` en `.env`) o el de `docker compose up -d --wait`:

```bash
npx sequelize-cli db:migrate --options-path .sequelizerc.cjs
npx sequelize-cli db:seed:all --options-path .sequelizerc.cjs
```

Para volver a empezar: `db:seed:undo:all` y `db:migrate:undo:all` con la misma opción `--options-path`.

| Tabla       | Relación                                                    |
| ----------- | ----------------------------------------------------------- |
| `usuarios`  | Un usuario (autor) tiene muchos trabajos y (revisor) muchas revisiones |
| `trabajos`  | Pertenece a un autor; tiene una o varias revisiones y una decisión |
| `revisions` | Pertenece a un trabajo y a un revisor                       |
| `decisions` | Pertenece a un trabajo (dictamen final del comité)          |

Rutas de la HU5: `GET /api/hu5/revisiones`, `GET /api/hu5/trabajos-revisiones` y `GET /api/hu5/decisiones`.
