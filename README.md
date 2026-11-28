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

Configura `SESSION_SECRET` con una clave propia y conserva el mismo valor entre reinicios:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

El servicio `correo` de Compose ejecuta Mailpit: captura los correos SMTP en desarrollo. Su bandeja está en `http://127.0.0.1:8025` y SMTP escucha en `127.0.0.1:1025`.

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto local de la API. Por defecto, `3000`. |
| `FRONTEND_ORIGINS` | Orígenes del frontend permitidos por CORS, separados por comas. Por defecto, `http://localhost:5173` y `http://127.0.0.1:5173`. |
| `DB_HOST` | Host que usa la API para conectarse a PostgreSQL. Usa `127.0.0.1` con el Compose incluido. |
| `DB_PORT` | Puerto local publicado por Compose. Por defecto, `5433`. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Nombre de la base, usuario y contraseña de desarrollo. |
| `SESSION_SECRET` | Clave de firma del identificador de sesión. Solo en el servidor. |
| `NODE_ENV` | `development` para HTTP local; en `production` la cookie exige HTTPS. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Servidor SMTP; valores de desarrollo para Mailpit en `env.local`. |
| `SMTP_FROM` | Remitente de los correos de recuperación. |
| `SMTP_USER`, `SMTP_PASSWORD` | Credenciales opcionales si el proveedor SMTP las requiere. |

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
├── middleware/         # Cookies, HTTP Basic y autorización por rol
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

La migración de Historia 1 agrega `sesiones` y `recuperaciones_contrasena`. Se utiliza el esquema compartido y migraciones; si preparaste antes una base con tablas inglesas mediante `db:sync`, conserva esa base y configura otra para ejecutar estas migraciones. El registro crea sus cuentas en `usuarios`.

Si aplicaste las migraciones preliminares de la rama del PR #1, conserva esa base y configura otra en `.env` para ejecutar la migración compartida. En Docker, un volumen de PostgreSQL ya inicializado conserva la base anterior aunque cambies `POSTGRES_DB`; crea la nueva base en PostgreSQL antes de ejecutar la migración.

Para cargar los datos de ejemplo de registro, asignación y evaluación, define `DEMO_PASSWORD` con al menos 12 caracteres en `.env` y ejecuta `npm run db:seed` en la base local. Las cuentas nuevas usan esa contraseña. Las cuentas existentes conservan sus credenciales. Los seeders pueden ejecutarse de nuevo sin duplicar filas y registran las filas que crean para una reversión selectiva. Las cargas anteriores sin ese registro se conservan. Si una fila registrada tiene dependencias ajenas a la demo, la reversión se cancela en su totalidad.

| Rol de ejemplo | Correo |
| --- | --- |
| Revisor con una evaluación en borrador | `luis.ramirez@ulima.edu.pe` |
| Comité | `ana.salazar@ulima.edu.pe` |
| Autora | `rosa.quispe@aloe.ulima.edu.pe` |

## Cuentas, sesiones y recuperación (Historia 1)

| Método | Ruta | Acceso y operación |
| --- | --- | --- |
| POST | `/api/usuarios` | Público. Registra autor, revisor o ambos. |
| POST | `/api/usuarios/sesiones` | Inicia sesión y emite cookie. |
| GET | `/api/usuarios/sesiones` | Consulta la cuenta autenticada. |
| DELETE | `/api/usuarios/sesiones` | Cierra la sesión y elimina la cookie. |
| GET, PATCH | `/api/usuarios/perfil` | Autor/revisor/ambos: consulta o edita su propio perfil e intereses. |
| PUT | `/api/usuarios/contrasena` | Cambia contraseña comprobando la actual. |
| GET | `/api/usuarios/asignaciones` | Revisor/ambos: sus asignaciones reales. |
| GET | `/api/usuarios/trabajos/:codigo/acceso` | Autor/ambos: comprueba propiedad del trabajo. |
| POST | `/api/usuarios/recuperaciones` | Público. Solicita un código por correo. |
| POST | `/api/usuarios/recuperaciones/verificacion` | Comprueba el código y entrega una prueba temporal. |
| POST | `/api/usuarios/recuperaciones/contrasena` | Restablece la contraseña con esa prueba. |

Las respuestas usan `{ status: 'success', data }`. Los errores usan `{ status: 'error', mensaje, errores? }`; `errores` contiene mensajes por campo. Se devuelve 400 para datos inválidos, 401 para sesión/credenciales inválidas, 403 para permisos insuficientes y 409 para duplicados o conflictos.

### Registro

Envía `names`, `surnames`, `email`, `institution`, `role`, `degree`, `studentCode`, `acceptedTerms`, `password` y `confirmPassword`. Las cuentas públicas solo pueden elegir `author`, `reviewer` o `both`. Autor y Ambos exigen carrera y código de 1 a 20 dígitos; para Revisor esos campos se guardan nulos. El correo debe pertenecer a `ulima.edu.pe` o `aloe.ulima.edu.pe` y se normaliza a minúsculas. `acceptedTerms` debe ser el booleano `true`.

La contraseña necesita 8 caracteres, una mayúscula y un número; admite hasta 72 bytes UTF-8. Se guarda con bcrypt y factor 12. Las cuentas de ejemplo con hashes scrypt siguen funcionando y su hash se actualiza a bcrypt al autenticarlas. La respuesta pública nunca incluye contraseña ni hash. El alta devuelve 201; el frontend inicia sesión a continuación.

### Sesión y permisos

```bash
curl -i -c /tmp/congreso-cookies.txt http://127.0.0.1:3000/api/usuarios/sesiones \
  -H 'Content-Type: application/json' \
  -d '{"correo":"rosa.quispe@aloe.ulima.edu.pe","contrasena":"TU_CLAVE_DEMO","recordar":false}'
curl -b /tmp/congreso-cookies.txt http://127.0.0.1:3000/api/usuarios/sesiones
curl -b /tmp/congreso-cookies.txt -X DELETE http://127.0.0.1:3000/api/usuarios/sesiones
```

`congreso.sid` lleva un identificador firmado; los datos están en PostgreSQL. La cookie es HttpOnly, SameSite=Lax, con ruta `/api` y Secure en producción. Sin Recordarme es una cookie de sesión del navegador y el store tiene 8 horas de inactividad. Con Recordarme su duración es de 7 días. El login regenera el identificador; la sesión sobrevive a reinicios conservando la clave y PostgreSQL. Un despliegue HTTPS detrás de proxy debe configurar la confianza en su proxy según el entorno.

Cada operación privada vuelve a comprobar usuario, bloqueo y rol en PostgreSQL. También se detecta una contraseña cambiada desde otra sesión. El cambio de contraseña conserva la sesión actual mediante una cookie nueva y elimina las demás; la recuperación invalida todas. HTTP Basic continúa disponible para las rutas de otras historias y sus comandos de ejemplo.

CORS permite los orígenes configurados con credenciales; un origen de navegador ajeno recibe 403. En React se utiliza `credentials: 'include'` y el proxy `/api` de Vite. Las visitas públicas no guardan sesiones vacías ni generan cookies de autenticación.

### Perfil y actividad

PATCH recibe `names`, `surnames`, `institution` y, para revisor/ambos, `interestIds` con IDs de los ejes vigentes. El usuario se obtiene de la sesión: no se acepta un ID del cliente para editar otras cuentas. El correo no se cambia en esta operación. El rol y el bloqueo se administran fuera del perfil personal.

GET devuelve la ficha pública, los IDs de intereses y `actividad` con `asignadas`, `entregadas`, `pendientes` y `vencidas`. Los contadores se calculan desde asignaciones y evaluaciones; un borrador no es una entrega y una vencida sigue pendiente.

### Recuperación por correo

1. POST a `recuperaciones` con `{ correo }` devuelve 202 y el mismo mensaje para cuentas existentes o desconocidas.
2. Si corresponde, el correo contiene seis dígitos. En local se consulta Mailpit; con un proveedor real se configuran las variables SMTP.
3. POST a `recuperaciones/verificacion` con `{ correo, codigo }` devuelve `{ token }` si es válido.
4. POST a `recuperaciones/contrasena` con `{ token, contrasena, confirmacion }` cambia la contraseña.

La solicitud vence a los 30 minutos, también al guardar la contraseña. Hay 120 segundos entre envíos y cinco intentos de código. Código y prueba son de un solo uso; PostgreSQL guarda sus hashes, no los valores entregados. El código utiliza HMAC con la clave del servidor. Un reenvío invalida la solicitud anterior. La actualización y la invalidación de sesiones se ejecutan en una transacción.

## API de configuración de ediciones

| Método | Ruta | Operación |
| --- | --- | --- |
| GET | `/api/ediciones` | Lista las ediciones en orden de año descendente. |
| GET, PATCH | `/api/ediciones/:edicionId` | Consulta o modifica datos generales, cronograma o estado. |
| GET, POST | `/api/ediciones/:edicionId/{ejes_tematicos,tipos_trabajo,criterios}` | Lista o crea elementos del catálogo seleccionado. |
| PUT, DELETE | `/api/ediciones/:edicionId/{ejes_tematicos,tipos_trabajo,criterios}/:id` | Actualiza o elimina un elemento. |
| POST, GET, DELETE | `/api/usuarios/sesiones` | Inicia, consulta o cierra la sesión web. |

Las lecturas de edición y catálogos son públicas. Para modificar la configuración, usa una cuenta de comité con HTTP Basic o la cookie de sesión emitida al iniciar sesión. Envía las fechas en ISO 8601 con zona horaria, por ejemplo `2027-09-30T23:59:00-05:00`. Los registros de catálogo en uso devuelven `409` al intentar eliminarlos.

## API de registro de trabajos

| Método | Ruta | Acceso y operación |
| --- | --- | --- |
| GET | `/api/trabajos/ediciones` | El autor consulta la edición, los ejes y los tipos para registrar un trabajo. |
| POST | `/api/trabajos` | El autor registra un borrador o envía un trabajo, con sus coautores. |
| GET | `/api/trabajos/mios` | Lista los trabajos que la persona registró y aquellos donde figura como coautora (por cuenta o por correo), del más reciente al más antiguo. Cada trabajo indica si es `titular`. |
| GET | `/api/trabajos/:trabajoId` | Consulta un trabajo propio o coautorado; `editable` es verdadero solo para el borrador de su titular. |
| PUT | `/api/trabajos/:trabajoId` | El autor edita un borrador o lo envía. Un trabajo enviado responde `409`. |
| PUT | `/api/trabajos/:trabajoId/version_final` | El autor de un trabajo aceptado guarda el enlace `https://` de su versión final (`enlace`). Otro estado responde `409`. |

Los coautores se envían en `coautores` como `{ nombre, correo, institucion }`. Su correo debe ser institucional (`@ulima.edu.pe` o `@aloe.ulima.edu.pe`), no puede repetirse ni coincidir con el del autor, y su cantidad no puede superar `maxCoautores` del tipo. `correspondencia` indica el correo del autor de correspondencia (por defecto, quien registra). Los coautores consultan el trabajo, su dictamen y su presentación una vez enviado; el borrador, la edición y la versión final son solo de quien lo registró. Los trabajos devuelven `actualizadoEn` y `enlaceFinal`. El título no puede repetirse entre los trabajos del mismo autor y edición, sin distinguir mayúsculas ni espacios en los extremos. Crear o editar un trabajo y sus autores ocurre en una sola transacción: si algo falla no se guarda nada.

## API de gestión de usuarios y métricas (HU7)

Solo para cuentas de comité, con cookie de sesión o HTTP Basic.

| Método | Ruta | Operación |
| --- | --- | --- |
| GET | `/api/gestion_usuarios` | Lista usuarios con su actividad. Filtros: `rol`, `estado` (`activos`/`bloqueados`), `institucion`, `busqueda`. |
| POST | `/api/gestion_usuarios` | Crea una cuenta y avisa por correo; la persona define su contraseña con «Olvidé mi contraseña». |
| PUT | `/api/gestion_usuarios/:id` | Edita datos y rol. No permite cambiar el propio rol ni quitar un rol con trabajos o revisiones asignadas. |
| PUT | `/api/gestion_usuarios/:id/bloqueo` | Bloquea con `motivo` (y `notificar` opcional). Invalida sus sesiones. |
| DELETE | `/api/gestion_usuarios/:id/bloqueo` | Reactiva la cuenta. |
| GET | `/api/metricas` | Indicadores, trabajos por eje y por estado. `edicionId` opcional. |
| GET | `/api/metricas/cumplimiento_revisores` | Cumplimiento y tiempos de entrega por revisor. |

Bloquear a un revisor **no borra** sus asignaciones: las revisiones pendientes quedan en pausa (`revisionesPausadas` en la respuesta). El seguimiento las excluye de pendientes y vencidas, las cuenta en `resumen.pausadas` y los recordatorios las rechazan. Al reactivar la cuenta vuelven a aparecer. Mientras tanto el comité puede reasignarlas desde el seguimiento. El estado del trabajo no cambia.

## API de asignación de revisiones (HU4)

Todas las rutas de asignación requieren una cuenta del rol **comité** (`committee`), mediante cookie o HTTP Basic. El prefijo de las rutas es `/api`.

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

Las rutas de revisión y dictamen aceptan cookie de sesión o HTTP Basic. La API escucha en `127.0.0.1` en desarrollo. El prefijo de las rutas es `/api`.

| Método | Ruta | Acceso y operación |
| --- | --- | --- |
| GET | `/revisiones` | El revisor consulta sus evaluaciones y el comité consulta todas. |
| GET | `/trabajos` | El comité consulta trabajos, revisiones y dictámenes. |
| GET | `/decisiones` | El comité consulta todos los dictámenes. El autor consulta los publicados de sus trabajos, con `detalle`: promedio ponderado, puntaje promedio por criterio y los comentarios de las evaluaciones enviadas, sin el nombre de los revisores. |
| GET | `/trabajos/:trabajoId/revisiones` | El comité consulta las notas ponderadas de las evaluaciones enviadas. |
| PUT | `/revisiones/:id` | El revisor asignado guarda el borrador o envía su evaluación. |
| PUT | `/decisiones/:trabajoId` | El comité guarda o publica el dictamen y fija el estado final del trabajo. |

```bash
curl --user luis.ramirez@ulima.edu.pe http://127.0.0.1:3000/api/revisiones
```

## API del programa del congreso (HU6)

El comité arma un **borrador** (sesiones y trabajos por sesión) y lo **publica**: el público y
los autores ven la última versión publicada, guardada como instantánea en la edición
(`program_snapshot`). Editar el borrador no cambia lo que ve el público hasta publicar de nuevo.
Todas las rutas aceptan `edicionId` (por defecto, la edición de mayor año).

| Método | Ruta | Acceso y operación |
| --- | --- | --- |
| GET | `/api/programa` | Público. Versión publicada con sesiones, horarios por trabajo y moderación. |
| GET | `/api/programa/gestion` | Comité. Borrador con salas, ejes, personas moderadoras, trabajos aceptados, conflictos y `cambiosSinPublicar`. |
| POST | `/api/programa/sesiones` | Comité. Crea una sesión (`nombre`, `ejeId`, `fecha`, `horaInicio`, `horaFin`, `salaId`, `moderadorId`). |
| PUT | `/api/programa/sesiones/:id` | Comité. Edita una sesión; el nuevo horario debe seguir alojando sus trabajos. |
| DELETE | `/api/programa/sesiones/:id` | Comité. Elimina la sesión; sus trabajos no se borran, quedan sin sesión. |
| PUT | `/api/programa/sesiones/:id/trabajos` | Comité. Reemplaza el contenido con `{ trabajos: [códigos] }`; el orden es el de exposición. |
| POST | `/api/programa/publicacion` | Comité. Publica el borrador. Responde `409` si hay solapamientos o no hay sesiones. |
| GET | `/api/programa/mi_presentacion` | Autor. Sus exposiciones según la versión publicada (fecha, hora, sala, moderación). |

Reglas: una sala no puede alojar dos sesiones a la vez y una persona no puede moderar dos a la vez
(`409` con el detalle); cada trabajo ocupa 20 minutos, así que la capacidad es la duración entre 20;
solo se programan trabajos aceptados de la edición y cada uno va en una sola sesión. La moderación
se elige entre cuentas activas de comité o revisor. Los cambios del programa de una edición se
serializan con un bloqueo, así que dos ediciones simultáneas no pueden crear un solapamiento.
`npm run db:seed` incluye salas y sesiones de ejemplo en la edición 2026.

## Integración con el frontend

El frontend usa React y Vite. Los repositorios asíncronos de `src/core/utils/repositories.js` son el punto de integración para adoptar las rutas de la API.
