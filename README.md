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
├── middleware/         # Autenticación HTTP Basic y autorización por rol
├── routes/             # Definición de rutas de Express
├── controllers/        # Controladores HTTP (sin acceso directo a base de datos)
├── services/           # Reglas de negocio y validaciones de dominio
├── repositories/       # Acceso a datos y transacciones con Sequelize
├── models/             # Modelos compartidos de Sequelize
└── db/                 # Conexión, migraciones y seeders de PostgreSQL
```

El proyecto usa módulos ECMAScript (ESM) con `"type": "module"`. `src/models` contiene los modelos compartidos en español. La configuración de Sequelize CLI y las migraciones usan CommonJS.

## Base de datos y datos de ejemplo

`npm run db:migrate` crea el esquema compartido y sus migraciones incrementales, incluidas las tablas `usuarios`, `trabajos`, `autores_trabajo`, `intereses_revisor`, `asignaciones_revision`, `historial_asignaciones`, `recordatorios_revision`, `revisiones`, `criterios`, `revision_criterios` y `decisiones`. Ejecuta este comando al preparar una base nueva y después de incorporar migraciones.

Si aplicaste las migraciones preliminares de la rama del PR #1, conserva esa base y configura otra en `.env` para ejecutar la migración compartida. En Docker, un volumen de PostgreSQL ya inicializado conserva la base anterior aunque cambies `POSTGRES_DB`; crea la nueva base en PostgreSQL antes de ejecutar la migración.

Para cargar los datos de ejemplo de registro, asignación y evaluación, define `DEMO_PASSWORD` con al menos 12 caracteres en `.env` y ejecuta `npm run db:seed` en la base local. Las cuentas nuevas usan esa contraseña. Las cuentas existentes conservan sus credenciales. Los seeders pueden ejecutarse de nuevo sin duplicar filas y registran las filas que crean para una reversión selectiva. Las cargas anteriores sin ese registro se conservan. Si una fila registrada tiene dependencias ajenas a la demo, la reversión se cancela en su totalidad.

| Rol de ejemplo | Correo |
| --- | --- |
| Revisor con una evaluación en borrador | `luis.ramirez@ulima.edu.pe` |
| Comité | `ana.salazar@ulima.edu.pe` |
| Autora | `rosa.quispe@aloe.ulima.edu.pe` |

## API de configuración de ediciones

| Método | Ruta | Operación |
| --- | --- | --- |
| GET | `/api/ediciones` | Lista las ediciones en orden de año descendente. |
| GET, PATCH | `/api/ediciones/:edicionId` | Consulta o modifica datos generales, cronograma o estado. |
| GET, POST | `/api/ediciones/:edicionId/{ejes_tematicos,tipos_trabajo,criterios}` | Lista o crea elementos del catálogo seleccionado. |
| PUT, DELETE | `/api/ediciones/:edicionId/{ejes_tematicos,tipos_trabajo,criterios}/:id` | Actualiza o elimina un elemento. |
| POST, GET, DELETE | `/api/usuarios/sesiones` | Inicia, consulta o cierra la sesión web del comité. |

Las lecturas de edición y catálogos son públicas. Para modificar la configuración, usa una cuenta de comité con HTTP Basic o la cookie de sesión emitida al iniciar sesión. La sesión de desarrollo caduca al reiniciar el backend. Envía las fechas en ISO 8601 con zona horaria, por ejemplo `2027-09-30T23:59:00-05:00`. Los registros de catálogo en uso devuelven `409` al intentar eliminarlos.

## API de registro de trabajos

| Método | Ruta | Acceso y operación |
| --- | --- | --- |
| GET | `/api/trabajos/ediciones` | El autor consulta la edición, los ejes y los tipos para registrar un trabajo. |
| POST | `/api/trabajos` | El autor registra un borrador o envía un trabajo. |

## API de asignación de revisiones (HU4)

Todas las rutas de asignación requieren autenticación HTTP Basic con una cuenta del rol **comité** (`committee`). El prefijo de las rutas es `/api`.

| Método | Ruta | Acceso y operación |
| --- | --- | --- |
| GET | `/trabajos?vista=recibidos` | Lista trabajos enviados con resumen de métricas, número de revisiones asignadas/entregadas, filtros (`eje`, `tipo`, `estado`, `busqueda`) y paginación opcional (`pagina`, `porPagina`). |
| GET | `/asignaciones_revision/usuarios` | Evalúa revisores candidatos para uno o varios trabajos (`trabajoIds` o `codigos`), devolviendo su carga actual y detección de conflictos (`coautor`, `institucion`, `ninguno`). |
| POST | `/trabajos/:trabajoId/asignaciones_revision` | Asigna revisores a un trabajo validando mínimo 2 / máximo 3 revisores, bloqueo por coautoría y justificación obligatoria ante misma institución. |
| POST | `/asignaciones_revision` | Asigna revisores de forma atómica a varios trabajos seleccionados (`trabajoIds` o `codigosTrabajo`). |
| GET | `/usuarios` | Lista revisores con sus líneas de interés y carga actual (`asignadas`, `entregadas`, `pendientes`, `vencidas`), con filtros (`linea`, `institucion`, `soloVencidas`, `busqueda`). |
| PUT | `/asignaciones_revision/:id` | Reasigna una revisión pendiente a otro revisor disponible dejando el `motivo` registrado en `historial_asignaciones`. |
| DELETE | `/asignaciones_revision/:id` | Retira a un revisor cuya evaluación aún no ha sido enviada, registrando el `motivo` obligatorio en `historial_asignaciones`. |
| GET | `/trabajos/:trabajoId/historial_asignaciones` | Consulta la bitácora auditable de asignaciones, reasignaciones y retiros de un trabajo. |
| GET | `/asignaciones_revision` | Lista revisiones pendientes ordenadas primero las vencidas y luego por fecha límite ascendente, con alerta sobre vencidas y resumen global. |
| POST | `/asignaciones_revision/:id/recordatorios_revision` | Registra un recordatorio individual sobre una revisión pendiente. |
| POST | `/recordatorios_revision` | Registra recordatorios masivos para todas las revisiones pendientes (o filtradas por `soloVencidas` / `asignacionIds`). |

```bash
curl --user ana.salazar@ulima.edu.pe 'http://127.0.0.1:3000/api/trabajos?vista=recibidos'
curl --user ana.salazar@ulima.edu.pe http://127.0.0.1:3000/api/usuarios
curl --user ana.salazar@ulima.edu.pe http://127.0.0.1:3000/api/asignaciones_revision
```

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
