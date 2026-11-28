import { sequelize } from '../db/sequelize.js'
import { AutorTrabajo, Edicion, EjeTematico, TipoTrabajo, Trabajo, Usuario } from '../models/index.js'
import { esCorreoInstitucional } from '../services/validacionesUsuario.js'

// HU3 · Nuevo trabajo
// El autor registra un trabajo y lo guarda como borrador o lo envía al comité

// Cómo se muestra cada estado de la base de datos
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

// Busca la edición del congreso que todavía está recibiendo trabajos
function buscarEdicionAbierta() {
  return Edicion.findOne({ where: { status: 'reception_open' } })
}

// La recepción está abierta si la fecha de cierre aún no pasa
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

// HU3 paso 3.2 · Revisa la lista de coautores. Devuelve el mensaje del primer error o null
function validarCoautores(coautores, correoAutor, maxCoautores) {
  if (!Array.isArray(coautores)) return 'Los coautores deben enviarse como una lista.'
  if (coautores.length > maxCoautores) return `Este tipo de trabajo admite hasta ${maxCoautores} coautores.`

  // Empieza con el correo del autor para que no se agregue a sí mismo como coautor
  const correos = [correoAutor]
  for (const coautor of coautores) {
    const completo = coautor && [coautor.nombre, coautor.correo, coautor.institucion]
      .every(campo => typeof campo === 'string' && campo.trim())
    if (!completo) return 'Cada coautor necesita nombre, correo e institución.'
    if (coautor.nombre.trim().length > 250 || coautor.institucion.trim().length > 200) {
      return 'El nombre admite hasta 250 caracteres y la institución hasta 200.'
    }

    const correo = coautor.correo.trim().toLowerCase()
    if (!esCorreoInstitucional(correo)) {
      return `El correo ${correo} debe ser institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).`
    }
    if (correos.includes(correo)) return `El correo ${correo} ya figura entre los autores del trabajo.`
    correos.push(correo)
  }
  return null
}

// HU3 mockup 3.2 · Guarda la lista de autores del trabajo: primero quien lo registra y luego los coautores
// Antes borra la lista anterior, así sirve tanto para crear como para editar.
// Se ejecuta dentro de la transacción de quien lo llama: o se guardan todos o ninguno
async function guardarAutores(trabajo, autor, coautores, correoCorrespondencia, transaction) {
  await AutorTrabajo.destroy({ where: { workId: trabajo.id }, transaction })

  // Si no se elige un autor de correspondencia válido, lo es quien registra el trabajo
  const correos = coautores.map(coautor => coautor.correo.trim().toLowerCase())
  const elegido = String(correoCorrespondencia ?? '').trim().toLowerCase()
  const correspondencia = correos.includes(elegido) ? elegido : autor.email

  // Si un coautor tiene cuenta en la aplicación, se enlaza con ella
  const cuentas = correos.length
    ? await Usuario.findAll({ where: { email: correos }, attributes: ['id', 'email'], transaction })
    : []
  const cuentaPorCorreo = new Map(cuentas.map(cuenta => [cuenta.email, cuenta.id]))

  await AutorTrabajo.bulkCreate([
    {
      workId: trabajo.id,
      userId: autor.id,
      name: autor.fullName,
      email: autor.email,
      institution: autor.institution,
      position: 1,
      isCorresponding: correspondencia === autor.email,
    },
    ...coautores.map((coautor, indice) => ({
      workId: trabajo.id,
      userId: cuentaPorCorreo.get(correos[indice]) ?? null,
      name: coautor.nombre.trim(),
      email: correos[indice],
      institution: coautor.institucion.trim(),
      position: indice + 2,
      isCorresponding: correspondencia === correos[indice],
    })),
  ], { transaction })
}

// Error de negocio lanzado dentro de una transacción para revertirla y responder con su código
class ErrorTrabajo extends Error {
  constructor(codigo, mensaje) {
    super(mensaje)
    this.codigo = codigo
  }
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

// GET /api/trabajos/ediciones
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
// Crea un trabajo nuevo, con sus coautores, como borrador o enviado
export async function crearTrabajo(req, res) {
  const datos = { estado: 'borrador', coautores: [], ...req.body }
  const error = validarTrabajo(datos)
  if (error) return enviarError(res, 400, error)

  const edicion = await buscarEdicionAbierta()
  if (!edicion) return enviarError(res, 404, 'No hay una edición con la recepción de trabajos abierta.')
  if (!recepcionAbierta(edicion)) return enviarError(res, 409, 'La recepción de trabajos está cerrada.')

  // El tipo y el eje tienen que ser de la edición abierta
  const tipo = await TipoTrabajo.findOne({ where: { id: datos.tipoId, editionId: edicion.id } })
  const eje = await EjeTematico.findOne({ where: { id: datos.ejeId, editionId: edicion.id } })
  if (!tipo || !eje) return enviarError(res, 400, 'El tipo o el eje no pertenecen a la edición abierta.')

  // Los coautores no pueden pasar el máximo del tipo de trabajo
  const autor = await Usuario.findByPk(res.locals.usuario.id)
  const errorCoautores = validarCoautores(datos.coautores, autor.email, tipo.maxCoauthors ?? 0)
  if (errorCoautores) return enviarError(res, 400, errorCoautores)

  try {
    const id = await sequelize.transaction(async transaction => {
      // El mismo autor no puede registrar dos trabajos con el mismo título
      const repetido = await Trabajo.findOne({
        where: { ownerId: autor.id, editionId: edicion.id, title: datos.titulo.trim() },
        transaction,
      })
      if (repetido) throw new ErrorTrabajo(409, 'Ya registró un trabajo con este título.')

      // Código visible: TRB-año-número, por ejemplo TRB-2027-001
      const cantidad = await Trabajo.count({ where: { editionId: edicion.id }, transaction })
      const codigo = `TRB-${edicion.year}-${String(cantidad + 1).padStart(3, '0')}`

      const trabajo = await Trabajo.create({
        code: codigo,
        title: datos.titulo.trim(),
        abstract: datos.resumen ?? '',
        keywords: datos.palabrasClave ?? [],
        documentUrl: datos.enlace || null,
        status: datos.estado === 'enviado' ? 'submitted' : 'draft',
        submittedAt: datos.estado === 'enviado' ? new Date() : null,
        ownerId: autor.id,
        editionId: edicion.id,
        workTypeId: tipo.id,
        thematicAxisId: eje.id,
      }, { transaction })

      // Primero va quien registra el trabajo, luego sus coautores
      await guardarAutores(trabajo, autor, datos.coautores, datos.correspondencia, transaction)
      return trabajo.id
    })

    const creado = await buscarTrabajo(id)
    return res.status(201).json({ status: 'success', data: formatearTrabajo(creado) })
  } catch (causa) {
    if (causa instanceof ErrorTrabajo) return enviarError(res, causa.codigo, causa.message)
    throw causa
  }
}

// HU3 3.2 · PUT /api/trabajos/:trabajoId
// Edita un borrador (por ejemplo, para agregar coautores) o lo envía al comité
// Si un trabajo ya fue enviado, no puede ser editado
export async function actualizarTrabajo(req, res) {
  const datos = { estado: 'borrador', coautores: [], ...req.body }
  const error = validarTrabajo(datos)
  if (error) return enviarError(res, 400, error)

  // El id de la URL tiene que ser un número entero, por ejemplo /api/trabajos/3
  const { trabajoId } = req.params
  if (!Number.isInteger(Number(trabajoId))) return enviarError(res, 400, 'El id del trabajo no es válido.')

  const autor = await Usuario.findByPk(res.locals.usuario.id)

  try {
    await sequelize.transaction(async transaction => {
      // Se bloquea la fila para que dos ediciones o un envío simultáneos no se pisen
      const trabajo = await Trabajo.findByPk(trabajoId, { transaction, lock: transaction.LOCK.UPDATE })
      // Solo el autor que registró el trabajo puede editarlo
      if (!trabajo || trabajo.ownerId !== autor.id) throw new ErrorTrabajo(404, 'El trabajo no existe.')
      if (trabajo.status !== 'draft') throw new ErrorTrabajo(409, 'El trabajo ya fue enviado y no admite cambios.')

      const edicion = await Edicion.findByPk(trabajo.editionId, { transaction })
      if (!recepcionAbierta(edicion)) throw new ErrorTrabajo(409, 'La recepción de trabajos está cerrada.')

      // El tipo y el eje tienen que ser de la misma edición del trabajo
      const tipo = await TipoTrabajo.findOne({ where: { id: datos.tipoId, editionId: edicion.id }, transaction })
      const eje = await EjeTematico.findOne({ where: { id: datos.ejeId, editionId: edicion.id }, transaction })
      if (!tipo || !eje) throw new ErrorTrabajo(400, 'El tipo o el eje no pertenecen a la edición abierta.')

      const errorCoautores = validarCoautores(datos.coautores, autor.email, tipo.maxCoauthors ?? 0)
      if (errorCoautores) throw new ErrorTrabajo(400, errorCoautores)

      await trabajo.update({
        title: datos.titulo.trim(),
        abstract: datos.resumen ?? '',
        keywords: datos.palabrasClave ?? [],
        documentUrl: datos.enlace || null,
        status: datos.estado === 'enviado' ? 'submitted' : 'draft',
        submittedAt: datos.estado === 'enviado' ? new Date() : null,
        workTypeId: tipo.id,
        thematicAxisId: eje.id,
      }, { transaction })
      await guardarAutores(trabajo, autor, datos.coautores, datos.correspondencia, transaction)
    })

    const actualizado = await buscarTrabajo(trabajoId)
    return res.json({ status: 'success', data: formatearTrabajo(actualizado) })
  } catch (causa) {
    if (causa instanceof ErrorTrabajo) return enviarError(res, causa.codigo, causa.message)
    throw causa
  }
}

// HU3 3.3 · GET /api/trabajos/mios
// Lista los trabajos que registró el autor, del más reciente al más antiguo
export async function listarMisTrabajos(req, res) {
  const trabajos = await Trabajo.findAll({
    where: { ownerId: res.locals.usuario.id },
    include: ['workType', 'thematicAxis', 'authors'],
    order: [['createdAt', 'DESC']],
  })
  return res.json({ status: 'success', data: trabajos.map(formatearTrabajo) })
}

// HU3 3.4 y 3.5 · GET /api/trabajos/:trabajoId
// Muestra el detalle de un trabajo del autor, con sus coautores
// "editable" le dice al frontend si muestra el formulario (borrador) o el modo de solo lectura (ya enviado)
export async function verTrabajo(req, res) {
  const { trabajoId } = req.params
  if (!Number.isInteger(Number(trabajoId))) return enviarError(res, 400, 'El id del trabajo no es válido.')

  // Un autor solo puede ver sus propios trabajos
  const trabajo = await buscarTrabajo(trabajoId)
  if (!trabajo || trabajo.ownerId !== res.locals.usuario.id) return enviarError(res, 404, 'El trabajo no existe.')

  return res.json({
    status: 'success',
    data: { ...formatearTrabajo(trabajo), editable: trabajo.status === 'draft' },
  })
}
