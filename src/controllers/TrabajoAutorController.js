import { Op } from 'sequelize'
import { sequelize } from '../db/sequelize.js'
import { AutorTrabajo, Edicion, EjeTematico, TipoTrabajo, Trabajo, Usuario } from '../models/index.js'
import { listarIdsTrabajosDelAutor } from '../repositories/autoriaRepository.js'
import { esCorreoInstitucional } from '../services/validacionesUsuario.js'

const estados = {
  draft: 'Borrador',
  submitted: 'Enviado',
  under_review: 'En revisión',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
}

function enviarError(res, codigo, mensaje) {
  return res.status(codigo).json({ status: 'error', mensaje })
}

function buscarEdicionAbierta() {
  return Edicion.findOne({ where: { status: 'reception_open' } })
}

function recepcionAbierta(edicion) {
  return edicion && new Date() <= edicion.receptionDeadline
}

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

// Compara en minúsculas para que «Mi Trabajo» y «MI TRABAJO» cuenten como el mismo título.
function buscarTituloRepetido({ autorId, edicionId, titulo, excluirId, transaction }) {
  const where = {
    ownerId: autorId,
    editionId: edicionId,
    [Op.and]: sequelize.where(sequelize.fn('lower', sequelize.col('title')), titulo.trim().toLowerCase()),
  }
  if (excluirId) where.id = { [Op.ne]: excluirId }
  return Trabajo.findOne({ where, transaction })
}

class ErrorTrabajo extends Error {
  constructor(codigo, mensaje) {
    super(mensaje)
    this.codigo = codigo
  }
}

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
    enlaceFinal: trabajo.finalDocumentUrl ?? null,
    fechaEnvio: trabajo.submittedAt,
    actualizadoEn: trabajo.updatedAt,
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

// El trabajo con los datos que dependen de quién lo consulta:
// "titular" es quien lo registró; solo esa persona puede editarlo o subir su versión final
function paraAutor(trabajo, usuarioId) {
  const titular = trabajo.ownerId === usuarioId
  return { ...formatearTrabajo(trabajo), titular, editable: titular && trabajo.status === 'draft' }
}

function buscarTrabajo(id) {
  return Trabajo.findByPk(id, { include: ['workType', 'thematicAxis', 'authors'] })
}

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

export async function crearTrabajo(req, res) {
  const datos = { estado: 'borrador', coautores: [], ...req.body }
  const error = validarTrabajo(datos)
  if (error) return enviarError(res, 400, error)

  const edicion = await buscarEdicionAbierta()
  if (!edicion) return enviarError(res, 404, 'No hay una edición con la recepción de trabajos abierta.')
  if (!recepcionAbierta(edicion)) return enviarError(res, 409, 'La recepción de trabajos está cerrada.')

  const tipo = await TipoTrabajo.findOne({ where: { id: datos.tipoId, editionId: edicion.id } })
  const eje = await EjeTematico.findOne({ where: { id: datos.ejeId, editionId: edicion.id } })
  if (!tipo || !eje) return enviarError(res, 400, 'El tipo o el eje no pertenecen a la edición abierta.')

  const autor = await Usuario.findByPk(res.locals.usuario.id)
  const errorCoautores = validarCoautores(datos.coautores, autor.email, tipo.maxCoauthors ?? 0)
  if (errorCoautores) return enviarError(res, 400, errorCoautores)

  try {
    const id = await sequelize.transaction(async transaction => {
      const repetido = await buscarTituloRepetido({
        autorId: autor.id,
        edicionId: edicion.id,
        titulo: datos.titulo,
        transaction,
      })
      if (repetido) throw new ErrorTrabajo(409, 'Ya registró un trabajo con este título.')

      const prefijo = `TRB-${edicion.year}-`
      await sequelize.query("SELECT pg_advisory_xact_lock(hashtext('congreso_codigo_trabajo'))", { transaction })
      const codigos = await Trabajo.findAll({
        attributes: ['code'],
        where: { code: { [Op.startsWith]: prefijo } },
        transaction,
      })
      const ultimo = Math.max(0, ...codigos.map(fila => Number(fila.code.slice(prefijo.length)) || 0))
      const codigo = `${prefijo}${String(ultimo + 1).padStart(3, '0')}`

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

export async function actualizarTrabajo(req, res) {
  const datos = { estado: 'borrador', coautores: [], ...req.body }
  const error = validarTrabajo(datos)
  if (error) return enviarError(res, 400, error)

  const { trabajoId } = req.params
  if (!Number.isInteger(Number(trabajoId))) return enviarError(res, 400, 'El id del trabajo no es válido.')

  const autor = await Usuario.findByPk(res.locals.usuario.id)

  try {
    await sequelize.transaction(async transaction => {
      // Se bloquea la fila para que dos ediciones o un envío simultáneos no se pisen
      const trabajo = await Trabajo.findByPk(trabajoId, { transaction, lock: transaction.LOCK.UPDATE })
      if (!trabajo || trabajo.ownerId !== autor.id) throw new ErrorTrabajo(404, 'El trabajo no existe.')
      if (trabajo.status !== 'draft') throw new ErrorTrabajo(409, 'El trabajo ya fue enviado y no admite cambios.')

      const edicion = await Edicion.findByPk(trabajo.editionId, { transaction })
      if (!recepcionAbierta(edicion)) throw new ErrorTrabajo(409, 'La recepción de trabajos está cerrada.')

      const tipo = await TipoTrabajo.findOne({ where: { id: datos.tipoId, editionId: edicion.id }, transaction })
      const eje = await EjeTematico.findOne({ where: { id: datos.ejeId, editionId: edicion.id }, transaction })
      if (!tipo || !eje) throw new ErrorTrabajo(400, 'El tipo o el eje no pertenecen a la edición abierta.')

      const errorCoautores = validarCoautores(datos.coautores, autor.email, tipo.maxCoauthors ?? 0)
      if (errorCoautores) throw new ErrorTrabajo(400, errorCoautores)

      const repetido = await buscarTituloRepetido({
        autorId: autor.id,
        edicionId: edicion.id,
        titulo: datos.titulo,
        excluirId: trabajo.id,
        transaction,
      })
      if (repetido) throw new ErrorTrabajo(409, 'Ya registró un trabajo con este título.')

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

export async function listarMisTrabajos(req, res) {
  const usuarioId = res.locals.usuario.id
  const ids = await listarIdsTrabajosDelAutor(usuarioId)
  const trabajos = await Trabajo.findAll({
    where: { id: [...ids.todos] },
    include: ['workType', 'thematicAxis', 'authors'],
    order: [['createdAt', 'DESC']],
  })
  return res.json({ status: 'success', data: trabajos.map(trabajo => paraAutor(trabajo, usuarioId)) })
}

// "editable" le dice al frontend si muestra el formulario (borrador de su titular) o el modo de solo lectura
export async function verTrabajo(req, res) {
  const { trabajoId } = req.params
  if (!Number.isInteger(Number(trabajoId))) return enviarError(res, 400, 'El id del trabajo no es válido.')

  const usuarioId = res.locals.usuario.id
  const ids = await listarIdsTrabajosDelAutor(usuarioId)
  const trabajo = ids.todos.has(Number(trabajoId)) ? await buscarTrabajo(trabajoId) : null
  if (!trabajo) return enviarError(res, 404, 'El trabajo no existe.')

  return res.json({ status: 'success', data: paraAutor(trabajo, usuarioId) })
}

export async function guardarVersionFinal(req, res) {
  const { trabajoId } = req.params
  if (!Number.isInteger(Number(trabajoId))) return enviarError(res, 400, 'El id del trabajo no es válido.')

  const enlace = typeof req.body?.enlace === 'string' ? req.body.enlace.trim() : ''
  if (!/^https:\/\/\S+$/.test(enlace) || enlace.length > 500) {
    return enviarError(res, 400, 'Ingrese una URL completa que empiece con https://')
  }

  const trabajo = await Trabajo.findByPk(trabajoId)
  if (!trabajo || trabajo.ownerId !== res.locals.usuario.id) return enviarError(res, 404, 'El trabajo no existe.')
  if (trabajo.status !== 'accepted') {
    return enviarError(res, 409, 'Solo los trabajos aceptados admiten una versión final.')
  }

  await trabajo.update({ finalDocumentUrl: enlace })
  return res.json({ status: 'success', data: formatearTrabajo(await buscarTrabajo(trabajo.id)) })
}
