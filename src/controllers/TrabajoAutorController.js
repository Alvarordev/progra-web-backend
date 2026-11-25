import { AutorTrabajo, Edicion, EjeTematico, TipoTrabajo, Trabajo, Usuario } from '../models/index.js'

// HU3 · Nuevo trabajo
// El autor registra un trabajo y lo guarda como borrador o lo envía al comitE

// COmo se muestra cada estado de la base de datos
const estados = {
  draft: 'Borrador',
  submitted: 'Enviado',
  under_review: 'En revisión',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
}

// Devuelve un error en el mismo formato de la API
function enviarError(res, codigo, mensaje) {
  return res.status(codigo).json({ status: 'error', mensaje })
}

// Busca la edicion del congreso que todavia esta recibiendo trabajos.-.
function buscarEdicionAbierta() {
  return Edicion.findOne({ where: { status: 'reception_open' } })
}

// La recepcion esta abierta si la fehca de cierre aun no pasa
function recepcionAbierta(edicion) {
  return edicion && new Date() <= edicion.receptionDeadline
}

// Revisa los datos que llegan del formulario. Devuelve el mensaje del primer error o null
// Un borrador solo necesita título, tipo y eje. Para enviarlo al comité se pide todo
function validarTrabajo(datos) {
  if (!['borrador', 'enviado'].includes(datos.estado)) return 'El estado debe ser «borrador» o «enviado».'
  if (typeof datos.titulo !== 'string' || !datos.titulo.trim()) return 'Ingrese el título del trabajo.'
  if (datos.titulo.length > 180) return 'El título admite como máximo 180 caracteres.'
  if (!datos.tipoId) return 'Debe elegir un tipo de trabajo.'
  if (!datos.ejeId) return 'Debe elegir un eje temático.'
  if (datos.resumen && typeof datos.resumen !== 'string') return 'El resumen debe ser texto.'
  if (datos.resumen && datos.resumen.length > 1500) return 'El resumen admite como máximo 1 500 caracteres.'

  if (datos.estado === 'enviado') {
    if (!datos.resumen || !datos.resumen.trim()) return 'Ingrese el resumen del trabajo.'
    if (!Array.isArray(datos.palabrasClave) || datos.palabrasClave.length < 3) return 'Agregue al menos 3 palabras clave.'
    if (!datos.enlace || !datos.enlace.startsWith('https://')) return 'Ingrese una URL completa que empiece con https://'
  }
  return null
}

// Convierte un trabajo de la base de datos al formato que usa el frontend
function formatearTrabajo(trabajo) {
  return {
    id: trabajo.id,
    codigo: trabajo.code,
    titulo: trabajo.title,
    estado: estados[trabajo.status],
    tipo: trabajo.workType.name,
    eje: trabajo.thematicAxis.name,
    resumen: trabajo.abstract,
    palabrasClave: trabajo.keywords,
    enlace: trabajo.documentUrl,
    fechaEnvio: trabajo.submittedAt,
    autores: trabajo.authors
      .sort((a, b) => a.position - b.position)
      .map(autor => ({
        nombre: autor.name,
        correo: autor.email,
        institucion: autor.institution,
        correspondencia: autor.isCorresponding,
      })),
  }
}

// Busca un trabajo con su tipo, eje y autores
function buscarTrabajo(id) {
  return Trabajo.findByPk(id, { include: ['workType', 'thematicAxis', 'authors'] })
}

// MEOTODO GET /api/trabajos/ediciones
// Datos para llenar el formulario --> la edición abierta, sus ejes y sus tipos de trabajo
export async function opciones(req, res) {
  const edicion = await buscarEdicionAbierta()
  if (!edicion) return enviarError(res, 404, 'No hay una edición con la recepción de trabajos abierta.')

  const ejes = await EjeTematico.findAll({ where: { editionId: edicion.id } })
  const tipos = await TipoTrabajo.findAll({ where: { editionId: edicion.id } })

  return res.json({
    status: 'success',
    data: {
      edicion: { id: edicion.id, nombre: edicion.name, cierreRecepcion: edicion.receptionDeadline },
      ejes: ejes.map(eje => ({ id: eje.id, nombre: eje.name })),
      tipos: tipos.map(tipo => ({ id: tipo.id, nombre: tipo.name, maxCoautores: tipo.maxCoauthors })),
    },
  })
}

// POST /api/trabajos
// Crea un trabajo nuevo como borrador o enviado
export async function crearTrabajo(req, res) {
  const datos = { estado: 'borrador', ...req.body }
  const error = validarTrabajo(datos)
  if (error) return enviarError(res, 400, error)

  const edicion = await buscarEdicionAbierta()
  if (!recepcionAbierta(edicion)) return enviarError(res, 409, 'La recepción de trabajos está cerrada.')

  // El tipo y el eje tienen que ser de la edición abierta
  const tipo = await TipoTrabajo.findOne({ where: { id: datos.tipoId, editionId: edicion.id } })
  const eje = await EjeTematico.findOne({ where: { id: datos.ejeId, editionId: edicion.id } })
  if (!tipo || !eje) return enviarError(res, 400, 'El tipo o el eje no pertenecen a la edición abierta.')

  // El mismo autor no puede registrar dos trabajos con el mismo título
  const autor = await Usuario.findByPk(res.locals.usuario.id)
  const repetido = await Trabajo.findOne({ where: { ownerId: autor.id, editionId: edicion.id, title: datos.titulo.trim() } })
  if (repetido) return enviarError(res, 409, 'Ya registró un trabajo con este título.')

  // Código visible: TRB-año-número, por ejemplo TRB-2027-001
  const cantidad = await Trabajo.count({ where: { editionId: edicion.id } })
  const codigo = `TRB-${edicion.year}-${String(cantidad + 1).padStart(3, '0')}`

  const trabajo = await Trabajo.create({
    code: codigo,
    title: datos.titulo.trim(),
    abstract: datos.resumen ?? '',
    keywords: datos.palabrasClave ?? [],
    documentUrl: datos.enlace || null,
    status: datos.estado === 'enviado' ? 'submitted' : 'draft',
    submittedAt: datos.estado === 'enviado' ? new Date() : null,
    editionId: edicion.id,
    ownerId: autor.id,
    workTypeId: tipo.id,
    thematicAxisId: eje.id,
  })

  // Quien registra el trabajo es el primer autor y el autor de correspondencia
  await AutorTrabajo.create({
    workId: trabajo.id,
    userId: autor.id,
    name: autor.fullName,
    email: autor.email,
    institution: autor.institution,
    position: 1,
    isCorresponding: true,
  })

  const creado = await buscarTrabajo(trabajo.id)
  return res.status(201).json({ status: 'success', data: formatearTrabajo(creado) })
}
