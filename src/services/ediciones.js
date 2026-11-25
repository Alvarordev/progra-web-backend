import { Op, col, fn } from 'sequelize'
import { sequelize, Criterio, Edicion, EjeTematico, TipoTrabajo, Trabajo } from '../models/index.js'

export class ErrorEdicion extends Error {
  constructor(codigo, mensaje) {
    super(mensaje)
    this.codigo = codigo
  }
}

const estados = new Map([
  ['En preparación', 'preparation'],
  ['Recepción abierta', 'reception_open'],
  ['En revisión', 'under_review'],
])
const estadoVisible = Object.fromEntries([...estados].map(([visible, estado]) => [estado, visible]))
const camposEdicion = { nombre: 'name', anio: 'year', sede: 'venue', descripcion: 'description' }
const fechas = {
  cierreRecepcion: 'receptionDeadline',
  cierreRevision: 'reviewDeadline',
  publicacion: 'publicationDate',
}
const formatos = new Set(['PDF', 'PDF · plantilla IEEE', 'PDF · orientación vertical'])

const catalogos = {
  ejes_tematicos: {
    modelo: EjeTematico,
    campos: { nombre: 'name', descripcion: 'description', responsable: 'coordinator' },
  },
  tipos_trabajo: {
    modelo: TipoTrabajo,
    campos: {
      nombre: 'name', extensionMaxima: 'maxLength', formatoEsperado: 'expectedFormat',
      admiteCoautores: 'allowsCoauthors', maxCoautores: 'maxCoauthors',
    },
  },
  criterios: { modelo: Criterio, campos: { nombre: 'name', descripcion: 'description', peso: 'weight' } },
}

function idValido(id) {
  return /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2147483647
}

function texto(valor, campo, maximo = Infinity, requerido = true) {
  if (typeof valor !== 'string' || (requerido && !valor.trim()) || valor.trim().length > maximo) {
    throw new ErrorEdicion(400, `El campo «${campo}» no es válido.`)
  }
  return valor.trim()
}

function validarCampos(body, permitidos, completos = false) {
  const campos = Object.keys(body ?? {})
  if (!body || typeof body !== 'object' || Array.isArray(body) || !campos.length ||
      campos.some(campo => !permitidos.includes(campo)) || (completos && campos.length !== permitidos.length)) {
    throw new ErrorEdicion(400, 'Envía los campos válidos para esta operación.')
  }
}

function fechaValida(valor) {
  if (typeof valor !== 'string') return null
  const coincidencia = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(valor)
  if (!coincidencia) return null
  const [, fecha, segundos = '00'] = coincidencia
  const calendario = new Date(`${fecha}:${segundos}Z`)
  const instante = new Date(valor)
  if (!Number.isFinite(instante.getTime()) || !Number.isFinite(calendario.getTime()) ||
      calendario.toISOString().slice(0, 19) !== `${fecha}:${segundos}`) return null
  return instante
}

function vistaEdicion(edicion) {
  return {
    id: edicion.id,
    ...Object.fromEntries(Object.entries({ ...camposEdicion, ...fechas }).map(([campo, atributo]) => [campo, edicion[atributo]])),
    estado: estadoVisible[edicion.status],
  }
}

async function obtenerEdicion(id, transaction) {
  if (!idValido(id)) throw new ErrorEdicion(400, 'El ID de la edición no es válido.')
  const edicion = await Edicion.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {})
  if (!edicion) throw new ErrorEdicion(404, 'La edición no existe.')
  return edicion
}

export async function listarEdiciones() {
  const ediciones = await Edicion.findAll({ order: [['year', 'DESC'], ['id', 'DESC']] })
  return ediciones.map(vistaEdicion)
}

export async function consultarEdicion(id) {
  return vistaEdicion(await obtenerEdicion(id))
}

async function validarTransicion(edicion, nuevoEstado, transaction) {
  if (nuevoEstado === edicion.status) return
  const siguiente = { preparation: 'reception_open', reception_open: 'under_review' }
  if (nuevoEstado !== siguiente[edicion.status]) {
    throw new ErrorEdicion(409, 'La edición no puede pasar al estado solicitado.')
  }
  const where = { editionId: edicion.id }
  const [ejes, tipos] = await Promise.all([
    EjeTematico.count({ where, transaction }),
    TipoTrabajo.count({ where, transaction }),
  ])
  if (!ejes || !tipos) throw new ErrorEdicion(409, 'Configura al menos un eje temático y un tipo de trabajo.')
  if (nuevoEstado === 'under_review' && Number(await Criterio.sum('weight', { where, transaction })) !== 100) {
    throw new ErrorEdicion(409, 'Los criterios deben sumar 100 antes de abrir la revisión.')
  }
}

export async function actualizarEdicion(id, body) {
  validarCampos(body, [...Object.keys(camposEdicion), ...Object.keys(fechas), 'estado'])
  const cambios = {}
  for (const [campo, atributo] of Object.entries(camposEdicion)) {
    if (!Object.hasOwn(body, campo)) continue
    if (campo === 'anio') {
      if (!Number.isInteger(body.anio) || body.anio < 1000 || body.anio > 9999) {
        throw new ErrorEdicion(400, 'El año debe tener cuatro dígitos.')
      }
      cambios.year = body.anio
    } else {
      cambios[atributo] = texto(body[campo], campo, { nombre: 200, sede: 250, descripcion: 400 }[campo], campo !== 'descripcion')
    }
  }
  for (const [campo, atributo] of Object.entries(fechas)) {
    if (!Object.hasOwn(body, campo)) continue
    const fecha = fechaValida(body[campo])
    if (!fecha) throw new ErrorEdicion(400, `Envía una fecha válida con zona horaria para «${campo}».`)
    cambios[atributo] = fecha
  }
  if (Object.hasOwn(body, 'estado')) {
    if (!estados.has(body.estado)) throw new ErrorEdicion(400, 'El estado de la edición no es válido.')
    cambios.status = estados.get(body.estado)
  }

  return sequelize.transaction(async transaction => {
    const edicion = await obtenerEdicion(id, transaction)
    const { receptionDeadline, reviewDeadline, publicationDate } = { ...edicion.get(), ...cambios }
    if (receptionDeadline >= reviewDeadline || reviewDeadline >= publicationDate) {
      throw new ErrorEdicion(400, 'Las fechas deben seguir el orden recepción, revisión y publicación.')
    }
    if (cambios.status) await validarTransicion(edicion, cambios.status, transaction)
    if (cambios.status === 'reception_open' && edicion.status !== cambios.status && receptionDeadline < new Date()) {
      throw new ErrorEdicion(409, 'Configura un plazo de recepción vigente antes de abrir la recepción.')
    }
    return vistaEdicion(await edicion.update(cambios, { transaction }))
  })
}

function datosCatalogo(tipo, body) {
  const { campos } = catalogos[tipo]
  validarCampos(body, Object.keys(campos), true)
  const nombre = texto(body.nombre, 'nombre', tipo === 'ejes_tematicos' ? 150 : 120)
  if (tipo === 'ejes_tematicos') {
    return { name: nombre, description: texto(body.descripcion, 'descripcion'), coordinator: texto(body.responsable, 'responsable', 150) }
  }
  if (tipo === 'criterios') {
    if (!Number.isInteger(body.peso) || body.peso < 1 || body.peso > 100) {
      throw new ErrorEdicion(400, 'El peso debe ser un entero de 1 a 100.')
    }
    return { name: nombre, description: texto(body.descripcion, 'descripcion'), weight: body.peso }
  }

  const extension = texto(body.extensionMaxima, 'extensionMaxima', 60)
  const extensionNumerica = Number.parseFloat(extension.replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(extensionNumerica) || extensionNumerica <= 0 ||
      !formatos.has(body.formatoEsperado) || typeof body.admiteCoautores !== 'boolean' ||
      (body.admiteCoautores
        ? !Number.isInteger(body.maxCoautores) || body.maxCoautores < 1 || body.maxCoautores > 32767
        : body.maxCoautores !== null)) {
    throw new ErrorEdicion(400, 'Revisa la extensión, el formato y el máximo de coautores.')
  }
  return {
    name: nombre, maxLength: extension, expectedFormat: body.formatoEsperado,
    allowsCoauthors: body.admiteCoautores, maxCoauthors: body.maxCoautores,
  }
}

function vistaCatalogo(tipo, fila, recibidos = 0) {
  const vista = {
    id: fila.id,
    ...Object.fromEntries(Object.entries(catalogos[tipo].campos).map(([campo, atributo]) => [campo, fila[atributo]])),
  }
  if (tipo === 'ejes_tematicos') vista.trabajos = recibidos
  return vista
}

export async function listarCatalogo(tipo, id) {
  const edicion = await obtenerEdicion(id)
  const where = { editionId: edicion.id }
  const filas = await catalogos[tipo].modelo.findAll({ where, order: [['id', 'ASC']] })
  const conteos = tipo === 'ejes_tematicos'
    ? await Trabajo.findAll({
      where: { ...where, status: { [Op.ne]: 'draft' } },
      attributes: ['thematicAxisId', [fn('COUNT', col('id')), 'total']],
      group: ['thematic_axis_id'],
      raw: true,
    })
    : []
  const recibidos = new Map(conteos.map(fila => [fila.thematicAxisId, Number(fila.total)]))
  return filas.map(fila => vistaCatalogo(tipo, fila, recibidos.get(fila.id)))
}

export async function guardarCatalogo(tipo, id, body, itemId) {
  const datos = datosCatalogo(tipo, body)
  const { modelo } = catalogos[tipo]
  return sequelize.transaction(async transaction => {
    const edicion = await obtenerEdicion(id, transaction)
    const fila = itemId === undefined
      ? await modelo.create({ ...datos, editionId: edicion.id }, { transaction })
      : await (await obtenerItem(modelo, edicion.id, itemId, transaction)).update(datos, { transaction })
    const recibidos = tipo === 'ejes_tematicos'
      ? await Trabajo.count({ where: { thematicAxisId: fila.id, status: { [Op.ne]: 'draft' } }, transaction })
      : 0
    return vistaCatalogo(tipo, fila, recibidos)
  })
}

async function obtenerItem(modelo, editionId, id, transaction) {
  if (!idValido(id)) throw new ErrorEdicion(400, 'El ID del elemento no es válido.')
  const fila = await modelo.findOne({ where: { id, editionId }, transaction })
  if (!fila) throw new ErrorEdicion(404, 'El elemento no pertenece a esta edición.')
  return fila
}

export async function eliminarCatalogo(tipo, id, itemId) {
  return sequelize.transaction(async transaction => {
    const edicion = await obtenerEdicion(id, transaction)
    const fila = await obtenerItem(catalogos[tipo].modelo, edicion.id, itemId, transaction)
    await fila.destroy({ transaction })
  })
}
