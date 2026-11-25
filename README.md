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
npm run db:migrate
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

El proyecto usa módulos ECMAScript (ESM) con `"type": "module"`. `src/models` contiene los modelos compartidos en español. La configuración de Sequelize CLI y las migraciones usan CommonJS.

## Base de datos y datos de ejemplo

`npm run db:migrate` crea el esquema compartido, incluidas las tablas `usuarios`, `trabajos`, `asignaciones_revision`, `revisiones`, `criterios`, `revision_criterios` y `decisiones`. Ejecuta este comando al preparar una base nueva y después de incorporar migraciones.

Si aplicaste las migraciones preliminares de la rama del PR #1, conserva esa base y configura otra en `.env` para ejecutar la migración compartida. En Docker, un volumen de PostgreSQL ya inicializado conserva la base anterior aunque cambies `POSTGRES_DB`; crea la nueva base en PostgreSQL antes de ejecutar la migración.

Para probar la HU5 con el conjunto de ejemplo del PR, configura `HU5_DEMO_PASSWORD` con una contraseña de al menos 12 caracteres en la base local de pruebas y ejecuta `npm run db:seed`. Todas las cuentas de ejemplo usan esa contraseña. El seeder se registra en la base para que repetir el comando no duplique los datos.

| Rol de ejemplo | Correo |
| --- | --- |
| Revisor con una evaluación en borrador | `luis.ramirez@ulima.edu.pe` |
| Comité | `ana.salazar@ulima.edu.pe` |
| Autora | `rosa.quispe@aloe.ulima.edu.pe` |

## API de revisión y dictamen

Las rutas de revisión y dictamen usan autenticación HTTP Basic con el correo y la contraseña de la cuenta. La API escucha en `127.0.0.1` en desarrollo. El prefijo de las rutas es `/api`.

| Método | Ruta | Acceso y operación |
| --- | --- | --- |
| GET | `/revisiones` | El revisor consulta sus evaluaciones y el comité consulta todas. |
| GET | `/trabajos` | El comité consulta trabajos, revisiones y dictámenes. |
| GET | `/decisiones` | El comité consulta todos los dictámenes. El autor consulta los publicados de sus trabajos. |
| GET | `/trabajos/:trabajoId/revisiones` | El comité consulta las notas ponderadas de las evaluaciones enviadas. |
| PUT | `/revisiones/:id` | El revisor asignado guarda el borrador o envía su evaluación. |
| PUT | `/decisiones/:trabajoId` | El comité guarda o publica el dictamen y fija el estado final del trabajo. |

```bash
curl --user luis.ramirez@ulima.edu.pe http://127.0.0.1:3000/api/revisiones
```

## Integración con el frontend

El frontend usa React y Vite. Los repositorios asíncronos de `src/core/utils/repositories.js` son el punto de integración para adoptar las rutas de la API.
