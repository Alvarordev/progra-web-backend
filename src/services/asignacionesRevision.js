import {
  actualizarEstadoTrabajo,
  contarAsignacionesTrabajo,
  crearAsignacionConBorrador,
  crearRecordatorios,
  ejecutarEnTransaccion,
  eliminarAsignacion,
  listarAsignacionesSeguimiento,
  listarHistorialPorTrabajo,
  listarRevisoresConRelaciones,
  listarTrabajosConRelaciones,
  obtenerAsignacionPorId,
  obtenerEdicionVigente,
  obtenerTrabajoPorIdOCodigo,
  obtenerTrabajosPorIdentificadores,
  obtenerUsuariosPorIds,
  registrarHistorialAsignacion,
} from '../repositories/asignacionesRevisionRepository.js'

export class ErrorNegocio extends Error {
  constructor(codigo, mensaje, detalles = undefined) {
    super(mensaje)
    this.name = 'ErrorNegocio'
    this.codigo = codigo
    this.detalles = detalles
  }
}

const etiquetasEstadoTrabajo = {
  draft: 'Borrador',
  submitted: 'Enviado',
  under_review: 'En revisión',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
}

const mapaFiltroEstadoTrabajo = new Map([
  ['submitted', 'submitted'],
  ['enviado', 'submitted'],
  ['under_review', 'under_review'],
  ['en revision', 'under_review'],
  ['accepted', 'accepted'],
  ['aceptado', 'accepted'],
  ['rejected', 'rejected'],
  ['rechazado', 'rejected'],
])

const aliasLineasInteres = new Map([
  ['ia y datos', 'inteligencia artificial y datos'],
  ['innovacion', 'innovacion y emprendimiento'],
])

const rolesPublicos = {
  author: 'autor',
  reviewer: 'revisor',
  both: 'ambos',
  committee: 'comite',
}

const accionesHistorialPublicas = {
  assigned: 'asignacion',
  reassigned: 'reasignacion',
  removed: 'retiro',
}

export function esEnteroPositivo(valor) {
  return /^[1-9]\d{0,9}$/.test(String(valor ?? '')) && Number(valor) <= 2147483647
}

export function esUuidValido(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(valor ?? '').trim()
  )
}

function esIdentificadorTrabajoValido(valor) {
  const texto = String(valor ?? '').trim()
  return (
    esEnteroPositivo(texto) ||
    (texto.length > 0 && texto.length <= 30 && /^[A-Za-z0-9-]+$/.test(texto))
  )
}

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function normalizarCorreo(valor) {
  return String(valor ?? '').trim().toLowerCase()
}

function normalizarNombrePersona(valor) {
  return normalizarTexto(valor).replace(
    /^(dra?\.?|mg\.?|mag\.?|ing\.?|lic\.?|msc\.?|phd\.?)\s+/i,
    ''
  )
}

function normalizarLineaInteres(valor) {
  const base = normalizarTexto(valor)
  return aliasLineasInteres.get(base) ?? base
}

export function obtenerFechaHoyLima() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function formatearFechaPublica(fechaIso) {
  if (!fechaIso || typeof fechaIso !== 'string') return ''
  const partes = fechaIso.slice(0, 10).split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaIso
}

export function parsearFechaLimite(valor) {
  const texto = String(valor ?? '').trim()
  let anio
  let mes
  let dia

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  const latino = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)

  if (iso) {
    anio = Number(iso[1])
    mes = Number(iso[2])
    dia = Number(iso[3])
  } else if (latino) {
    dia = Number(latino[1])
    mes = Number(latino[2])
    anio = Number(latino[3])
  } else {
    throw new ErrorNegocio(
      400,
      'La fecha límite no es válida. Use el formato AAAA-MM-DD o DD/MM/AAAA.'
    )
  }

  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia))
  if (
    fechaUtc.getUTCFullYear() !== anio ||
    fechaUtc.getUTCMonth() !== mes - 1 ||
    fechaUtc.getUTCDate() !== dia
  ) {
    throw new ErrorNegocio(400, 'La fecha límite ingresada no existe en el calendario.')
  }

  return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(
    dia
  ).padStart(2, '0')}`
}

function calcularDiferenciaDias(fechaLimiteIso, hoyIso) {
  const [a1, m1, d1] = fechaLimiteIso.split('-').map(Number)
  const [a2, m2, d2] = hoyIso.split('-').map(Number)
  const milisegundosPorDia = 86_400_000
  return Math.round(
    (Date.UTC(a1, m1 - 1, d1) - Date.UTC(a2, m2 - 1, d2)) / milisegundosPorDia
  )
}

function parsearPaginacion({ pagina, porPagina }, porDefecto = null) {
  if (pagina === undefined && porPagina === undefined) {
    return null
  }
  const numPagina = pagina === undefined ? 1 : Number(pagina)
  const numPorPagina = porPagina === undefined ? (porDefecto ?? 8) : Number(porPagina)

  if (!Number.isInteger(numPagina) || numPagina < 1) {
    throw new ErrorNegocio(400, 'El parámetro de página debe ser un entero positivo.')
  }
  if (!Number.isInteger(numPorPagina) || numPorPagina < 1 || numPorPagina > 100) {
    throw new ErrorNegocio(
      400,
      'El parámetro porPagina debe ser un entero entre 1 y 100.'
    )
  }

  return { pagina: numPagina, porPagina: numPorPagina }
}

function aplicarPaginacion(elementos, configPaginacion) {
  const totalFiltrados = elementos.length
  if (!configPaginacion) {
    return {
      items: elementos,
      paginacion: {
        pagina: 1,
        porPagina: totalFiltrados || 1,
        totalFiltrados,
        totalPaginas: 1,
      },
    }
  }

  const { pagina, porPagina } = configPaginacion
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / porPagina))
  const inicio = (pagina - 1) * porPagina
  return {
    items: elementos.slice(inicio, inicio + porPagina),
    paginacion: {
      pagina,
      porPagina,
      totalFiltrados,
      totalPaginas,
    },
  }
}

function obtenerFirmantesTrabajo(trabajo) {
  const firmantes = [...(trabajo.authors ?? [])].sort((a, b) => a.position - b.position)
  if (firmantes.length > 0) {
    return firmantes.map(autor => ({
      id: autor.id,
      usuarioId: autor.userId ?? null,
      nombre: autor.name,
      correo: autor.email ?? null,
      institucion: autor.institution,
      esCorrespondencia: autor.isCorresponding,
      posicion: autor.position,
    }))
  }

  if (trabajo.owner) {
    return [
      {
        id: null,
        usuarioId: trabajo.owner.id,
        nombre: trabajo.owner.fullName,
        correo: trabajo.owner.email,
        institucion: trabajo.owner.institution,
        esCorrespondencia: true,
        posicion: 1,
      },
    ]
  }

  return []
}

function obtenerAutorCorrespondencia(trabajo) {
  const firmantes = obtenerFirmantesTrabajo(trabajo)
  return (
    firmantes.find(autor => autor.esCorrespondencia) ??
    firmantes[0] ?? {
      nombre: trabajo.owner?.fullName ?? '',
      correo: trabajo.owner?.email ?? '',
      institucion: trabajo.owner?.institution ?? '',
    }
  )
}

export function evaluarConflictoRevisor(revisor, trabajo) {
  const correoRevisor = normalizarCorreo(revisor.email)
  const nombreRevisor = normalizarNombrePersona(revisor.fullName)
  const firmantes = obtenerFirmantesTrabajo(trabajo)

  const esPropietario =
    trabajo.ownerId === revisor.id ||
    (correoRevisor && normalizarCorreo(trabajo.owner?.email) === correoRevisor) ||
    (nombreRevisor && normalizarNombrePersona(trabajo.owner?.fullName) === nombreRevisor)

  const esFirmante = firmantes.some(
    autor =>
      (autor.usuarioId && autor.usuarioId === revisor.id) ||
      (correoRevisor && autor.correo && normalizarCorreo(autor.correo) === correoRevisor) ||
      (nombreRevisor && normalizarNombrePersona(autor.nombre) === nombreRevisor)
  )

  if (esPropietario || esFirmante) {
    return {
      tipo: 'coautor',
      etiqueta: revisor.isFemale ? 'Coautora del trabajo' : 'Coautor del trabajo',
      bloqueante: true,
    }
  }

  const correspondencia = obtenerAutorCorrespondencia(trabajo)
  if (
    correspondencia.institucion &&
    revisor.institution &&
    normalizarTexto(correspondencia.institucion) === normalizarTexto(revisor.institution)
  ) {
    return {
      tipo: 'institucion',
      etiqueta: 'Misma institución',
      institucion: correspondencia.institucion,
      bloqueante: false,
    }
  }

  return {
    tipo: 'ninguno',
    etiqueta: 'Sin conflicto',
    bloqueante: false,
  }
}

function evaluarConflictoConjunto(revisor, trabajos) {
  const conflictosCoautor = []
  const conflictosInstitucion = []

  for (const trabajo of trabajos) {
    const conflicto = evaluarConflictoRevisor(revisor, trabajo)
    if (conflicto.tipo === 'coautor') {
      conflictosCoautor.push(trabajo.code)
    } else if (conflicto.tipo === 'institucion') {
      conflictosInstitucion.push(trabajo.code)
    }
  }

  if (conflictosCoautor.length > 0) {
    return {
      tipo: 'coautor',
      etiqueta: revisor.isFemale ? 'Coautora del trabajo' : 'Coautor del trabajo',
      bloqueante: true,
      trabajosEnConflicto: conflictosCoautor,
    }
  }

  if (conflictosInstitucion.length > 0) {
    return {
      tipo: 'institucion',
      etiqueta: 'Misma institución',
      bloqueante: false,
      trabajosEnConflicto: conflictosInstitucion,
    }
  }

  return {
    tipo: 'ninguno',
    etiqueta: 'Sin conflicto',
    bloqueante: false,
    trabajosEnConflicto: [],
  }
}

function resumirParticipante(usuario) {
  if (!usuario) return null
  return {
    id: usuario.id,
    nombre: usuario.fullName,
    correo: usuario.email,
    rol: rolesPublicos[usuario.role] ?? usuario.role,
    institucion: usuario.institution,
  }
}

function formatearAsignacionResumen(asignacion, hoyIso) {
  const entregada = asignacion.review?.status === 'submitted'
  const vencida = !entregada && asignacion.dueDate < hoyIso
  return {
    id: asignacion.id,
    trabajoId: asignacion.workId,
    revisorId: asignacion.reviewerId,
    revisor: asignacion.reviewer ? resumirParticipante(asignacion.reviewer) : null,
    fechaLimite: asignacion.dueDate,
    fechaLimiteTexto: formatearFechaPublica(asignacion.dueDate),
    estadoRevision: entregada ? 'entregada' : vencida ? 'vencida' : 'pendiente',
    justificacionConflicto: asignacion.conflictJustification ?? null,
  }
}

function formatearTrabajoRecibido(trabajo, hoyIso) {
  const asignaciones = [...(trabajo.assignments ?? [])].sort((a, b) => a.id - b.id)
  const cantidadAsignados = asignaciones.length
  const cantidadEntregadas = asignaciones.filter(
    item => item.review?.status === 'submitted'
  ).length
  const palabraEntregada = cantidadEntregadas === 1 ? 'entregada' : 'entregadas'
  const firmantes = obtenerFirmantesTrabajo(trabajo)
  const correspondencia = obtenerAutorCorrespondencia(trabajo)

  return {
    id: trabajo.id,
    codigo: trabajo.code,
    titulo: trabajo.title,
    ejeId: trabajo.thematicAxisId,
    eje: trabajo.thematicAxis?.name ?? '',
    tipoId: trabajo.workTypeId,
    tipo: trabajo.workType?.name ?? '',
    estado: etiquetasEstadoTrabajo[trabajo.status] ?? trabajo.status,
    estadoCodigo: trabajo.status,
    institucion: correspondencia.institucion,
    autorCorrespondencia: correspondencia.nombre,
    autores: firmantes.map(autor => autor.nombre),
    firmantes,
    revisoresAsignados: cantidadAsignados,
    revisionesEntregadas: cantidadEntregadas,
    revisores:
      cantidadAsignados > 0
        ? `${cantidadAsignados} asignados · ${cantidadEntregadas} ${palabraEntregada}`
        : 'Sin asignar',
    asignaciones: asignaciones.map(item => formatearAsignacionResumen(item, hoyIso)),
  }
}

function calcularCargaRevisor(revisor, hoyIso, edicionId = null) {
  const asignaciones = (revisor.reviewAssignments ?? []).filter(item =>
    edicionId ? item.work?.editionId === edicionId : true
  )
  const entregadas = asignaciones.filter(
    item => item.review?.status === 'submitted'
  ).length
  const pendientes = asignaciones.filter(item => item.review?.status !== 'submitted')
  const vencidas = pendientes.filter(item => item.dueDate < hoyIso).length

  return {
    asignadas: asignaciones.length,
    entregadas,
    pendientes: pendientes.length,
    vencidas,
  }
}

function formatearRevisor(revisor, hoyIso, edicionId = null) {
  const carga = calcularCargaRevisor(revisor, hoyIso, edicionId)
  const intereses = [...(revisor.interests ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'es')
  )
  return {
    id: revisor.id,
    nombre: revisor.fullName,
    correo: revisor.email,
    rol: rolesPublicos[revisor.role] ?? revisor.role,
    institucion: revisor.institution,
    bloqueado: revisor.blocked,
    lineasInteres: intereses.map(eje => eje.name),
    intereses: intereses.map(eje => ({ id: eje.id, nombre: eje.name })),
    ...carga,
  }
}

function validarTrabajoAptoParaAsignacion(trabajo) {
  if (trabajo.status === 'draft') {
    throw new ErrorNegocio(
      409,
      `El trabajo ${trabajo.code} está en borrador y no participa del proceso de revisión.`
    )
  }
  if (
    trabajo.status === 'accepted' ||
    trabajo.status === 'rejected' ||
    trabajo.decision?.status === 'published'
  ) {
    throw new ErrorNegocio(
      409,
      `El trabajo ${trabajo.code} ya tiene una decisión final publicada y no admite cambios de asignación.`
    )
  }
}

function normalizarListaRevisorIds(revisorIds) {
  if (!Array.isArray(revisorIds) || revisorIds.length === 0) {
    throw new ErrorNegocio(400, 'Debe seleccionar al menos un revisor para asignar.')
  }
  const limpios = revisorIds.map(id => String(id ?? '').trim())
  if (!limpios.every(esUuidValido)) {
    throw new ErrorNegocio(400, 'Uno o más identificadores de revisor no tienen formato UUID válido.')
  }
  if (new Set(limpios.map(id => id.toLowerCase())).size !== limpios.length) {
    throw new ErrorNegocio(400, 'No repita el mismo revisor dentro de la selección.')
  }
  return limpios
}

async function validarYObtenerRevisoresSeleccionados(revisorIds, transaction) {
  const usuarios = await obtenerUsuariosPorIds(revisorIds, { transaction })
  const mapaUsuarios = new Map(usuarios.map(u => [u.id.toLowerCase(), u]))

  return revisorIds.map(id => {
    const usuario = mapaUsuarios.get(id.toLowerCase())
    if (!usuario) {
      throw new ErrorNegocio(404, `El revisor con ID ${id} no existe.`)
    }
    if (!['reviewer', 'both'].includes(usuario.role)) {
      throw new ErrorNegocio(
        400,
        `La cuenta de ${usuario.fullName} no tiene permisos de revisor.`
      )
    }
    if (usuario.blocked) {
      throw new ErrorNegocio(
        409,
        `La cuenta del revisor ${usuario.fullName} se encuentra bloqueada.`
      )
    }
    return usuario
  })
}

async function ejecutarAsignacionSobreTrabajos({
  trabajos,
  revisores,
  fechaLimiteIso,
  permitirMismaInstitucion,
  justificacionTexto,
  usuarioId,
  transaction,
}) {
  const conflictosParaValidar = []

  for (const trabajo of trabajos) {
    validarTrabajoAptoParaAsignacion(trabajo)

    const asignadosActuales = new Set(
      (trabajo.assignments ?? []).map(item => item.reviewerId.toLowerCase())
    )

    for (const revisor of revisores) {
      if (asignadosActuales.has(revisor.id.toLowerCase())) {
        throw new ErrorNegocio(
          409,
          `El revisor ${revisor.fullName} ya se encuentra asignado al trabajo ${trabajo.code}.`
        )
      }
    }

    const totalResultante = asignadosActuales.size + revisores.length
    if (totalResultante < 2 || totalResultante > 3) {
      throw new ErrorNegocio(
        400,
        `Cada trabajo debe contar con un mínimo de 2 y un máximo de 3 revisores asignados (${trabajo.code} quedaría con ${totalResultante}).`
      )
    }

    for (const revisor of revisores) {
      const conflicto = evaluarConflictoRevisor(revisor, trabajo)
      if (conflicto.tipo === 'coautor') {
        throw new ErrorNegocio(
          409,
          `Conflicto por coautoría: ${revisor.fullName} figura como autor o coautor del trabajo ${trabajo.code}. No es posible asignar a un coautor.`
        )
      }
      if (conflicto.tipo === 'institucion') {
        if (permitirMismaInstitucion === false || !justificacionTexto) {
          throw new ErrorNegocio(
            409,
            `Conflicto de institución detectado: ${revisor.fullName} pertenece a la misma institución del autor de correspondencia en ${trabajo.code} (${conflicto.institucion}). Confirme la excepción e ingrese la justificación del comité.`
          )
        }
      }
      conflictosParaValidar.push({ trabajo, revisor, conflicto })
    }
  }

  const creadas = []
  for (const { trabajo, revisor, conflicto } of conflictosParaValidar) {
    const justificacionAplicada =
      conflicto.tipo === 'institucion' ? justificacionTexto : null

    const asignacion = await crearAsignacionConBorrador(
      {
        workId: trabajo.id,
        reviewerId: revisor.id,
        dueDate: fechaLimiteIso,
        conflictJustification: justificacionAplicada,
      },
      transaction
    )
    asignacion.reviewer = revisor

    await registrarHistorialAsignacion(
      {
        workId: trabajo.id,
        action: 'assigned',
        reviewerId: revisor.id,
        performedById: usuarioId,
        reason: null,
        conflictJustification: justificacionAplicada,
        dueDate: fechaLimiteIso,
      },
      transaction
    )

    creadas.push(asignacion)
  }

  for (const trabajo of trabajos) {
    if (trabajo.status === 'submitted') {
      await actualizarEstadoTrabajo(trabajo, 'under_review', transaction)
    }
  }

  return creadas
}

export async function listarTrabajosRecibidos(filtros = {}) {
  const { edicionId, eje, tipo, estado, busqueda, q, pagina, porPagina } = filtros

  let idEdicion = null
  if (edicionId !== undefined && edicionId !== '') {
    if (!esEnteroPositivo(edicionId)) {
      throw new ErrorNegocio(400, 'El identificador de la edición no es válido.')
    }
    idEdicion = Number(edicionId)
  }

  let estadoInterno = null
  if (estado && normalizarTexto(estado) !== 'todos') {
    estadoInterno = mapaFiltroEstadoTrabajo.get(normalizarTexto(estado))
    if (!estadoInterno) {
      throw new ErrorNegocio(
        400,
        'El filtro de estado no es válido. Valores admitidos: Enviado, En revisión, Aceptado o Rechazado.'
      )
    }
  }

  const configPaginacion = parsearPaginacion({ pagina, porPagina }, 8)
  const hoyIso = obtenerFechaHoyLima()
  const todosLosTrabajos = await listarTrabajosConRelaciones({ edicionId: idEdicion })

  const borradores = todosLosTrabajos.filter(item => item.status === 'draft')
  const recibidos = todosLosTrabajos.filter(item => item.status !== 'draft')

  const resumen = {
    total: todosLosTrabajos.length,
    enviados: recibidos.length,
    borradores: borradores.length,
    enRevision: recibidos.filter(item => item.status === 'under_review').length,
    sinRevisores: recibidos.filter(item => !(item.assignments?.length > 0)).length,
    conDecision: recibidos.filter(item =>
      ['accepted', 'rejected'].includes(item.status)
    ).length,
  }

  const filtroEje =
    eje && normalizarTexto(eje) !== 'todos' ? String(eje).trim() : null
  const filtroTipo =
    tipo && normalizarTexto(tipo) !== 'todos' ? String(tipo).trim() : null
  const terminoBusqueda = normalizarTexto(busqueda ?? q ?? '')

  const formateados = recibidos.map(trabajo => formatearTrabajoRecibido(trabajo, hoyIso))

  const filtrados = formateados.filter(trabajo => {
    if (filtroEje) {
      const coincideIdEje =
        esEnteroPositivo(filtroEje) && trabajo.ejeId === Number(filtroEje)
      const coincideNombreEje =
        normalizarLineaInteres(trabajo.eje) === normalizarLineaInteres(filtroEje)
      if (!coincideIdEje && !coincideNombreEje) return false
    }

    if (filtroTipo) {
      const coincideIdTipo =
        esEnteroPositivo(filtroTipo) && trabajo.tipoId === Number(filtroTipo)
      const coincideNombreTipo =
        normalizarTexto(trabajo.tipo) === normalizarTexto(filtroTipo)
      if (!coincideIdTipo && !coincideNombreTipo) return false
    }

    if (estadoInterno && trabajo.estadoCodigo !== estadoInterno) {
      return false
    }

    if (terminoBusqueda) {
      const enCodigo = normalizarTexto(trabajo.codigo).includes(terminoBusqueda)
      const enTitulo = normalizarTexto(trabajo.titulo).includes(terminoBusqueda)
      const enAutores = trabajo.autores.some(autor =>
        normalizarTexto(autor).includes(terminoBusqueda)
      )
      if (!enCodigo && !enTitulo && !enAutores) return false
    }

    return true
  })

  const { items, paginacion } = aplicarPaginacion(filtrados, configPaginacion)

  return {
    resumen,
    trabajos: items,
    paginacion,
  }
}

export async function listarCandidatosAsignacion(consulta = {}) {
  const { trabajoIds, codigos, busqueda, q, edicionId } = consulta

  let idEdicion = null
  if (edicionId !== undefined && edicionId !== '') {
    if (!esEnteroPositivo(edicionId)) {
      throw new ErrorNegocio(400, 'El identificador de la edición no es válido.')
    }
    idEdicion = Number(edicionId)
  }

  const listaIds = String(trabajoIds ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
  const listaCodigos = String(codigos ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)

  if (!listaIds.length && !listaCodigos.length) {
    throw new ErrorNegocio(
      400,
      'Indique al menos un trabajo en trabajoIds o codigos para evaluar conflictos.'
    )
  }
  if (!listaIds.every(esEnteroPositivo)) {
    throw new ErrorNegocio(400, 'Los identificadores en trabajoIds deben ser enteros positivos.')
  }
  if (!listaCodigos.every(esIdentificadorTrabajoValido)) {
    throw new ErrorNegocio(400, 'Uno o más códigos de trabajo no son válidos.')
  }

  const trabajos = await obtenerTrabajosPorIdentificadores({
    ids: listaIds.map(Number),
    codigos: listaCodigos,
  })

  const totalSolicitados = new Set([
    ...listaIds.map(id => `id:${Number(id)}`),
    ...listaCodigos.map(c => `code:${c}`),
  ]).size
  if (trabajos.length < totalSolicitados) {
    throw new ErrorNegocio(404, 'Uno o más trabajos seleccionados no existen.')
  }

  const hoyIso = obtenerFechaHoyLima()
  const edicionObjetivo = idEdicion ?? trabajos[0]?.editionId ?? null
  const revisores = await listarRevisoresConRelaciones({ edicionId: edicionObjetivo })
  const termino = normalizarTexto(busqueda ?? q ?? '')

  const candidatos = revisores
    .filter(revisor => !revisor.blocked)
    .map(revisor => {
      const base = formatearRevisor(revisor, hoyIso, edicionObjetivo)
      const conflicto = evaluarConflictoConjunto(revisor, trabajos)
      const yaAsignadoEn = trabajos
        .filter(trabajo =>
          (trabajo.assignments ?? []).some(a => a.reviewerId === revisor.id)
        )
        .map(trabajo => trabajo.code)

      return {
        ...base,
        yaAsignado: yaAsignadoEn.length > 0,
        yaAsignadoEn,
        conflicto,
      }
    })
    .filter(candidato => {
      if (!termino) return true
      return (
        normalizarTexto(candidato.nombre).includes(termino) ||
        normalizarTexto(candidato.institucion).includes(termino) ||
        candidato.lineasInteres.some(linea =>
          normalizarLineaInteres(linea).includes(normalizarLineaInteres(termino))
        )
      )
    })

  const hayConflictoCoautor = candidatos.some(c => c.conflicto.tipo === 'coautor')
  const hayConflictoInstitucion = candidatos.some(
    c => c.conflicto.tipo === 'institucion'
  )

  return {
    trabajos: trabajos.map(t => ({
      id: t.id,
      codigo: t.code,
      titulo: t.title,
      eje: t.thematicAxis?.name ?? '',
      estado: etiquetasEstadoTrabajo[t.status] ?? t.status,
    })),
    reglas: {
      minimoRevisores: 2,
      maximoRevisores: 3,
      hayConflictos: hayConflictoCoautor || hayConflictoInstitucion,
      hayConflictoCoautor,
      hayConflictoInstitucion,
    },
    candidatos,
  }
}

export async function asignarRevisoresTrabajo({
  identificadorTrabajo,
  datos = {},
  usuarioId,
}) {
  if (!esIdentificadorTrabajoValido(identificadorTrabajo)) {
    throw new ErrorNegocio(400, 'El identificador del trabajo no es válido.')
  }

  const {
    revisorIds,
    fechaLimite,
    permitirMismaInstitucion,
    justificacion = '',
  } = datos ?? {}

  if (typeof justificacion !== 'string') {
    throw new ErrorNegocio(400, 'La justificación debe ser una cadena de texto.')
  }
  if (
    permitirMismaInstitucion !== undefined &&
    typeof permitirMismaInstitucion !== 'boolean'
  ) {
    throw new ErrorNegocio(400, 'El campo permitirMismaInstitucion debe ser booleano.')
  }

  const idsRevisores = normalizarListaRevisorIds(revisorIds)
  const fechaLimiteIso = parsearFechaLimite(fechaLimite)
  const justificacionTexto = justificacion.trim()
  const hoyIso = obtenerFechaHoyLima()

  return ejecutarEnTransaccion(async transaction => {
    const trabajo = await obtenerTrabajoPorIdOCodigo(identificadorTrabajo, {
      transaction,
      bloquear: true,
    })
    if (!trabajo) {
      throw new ErrorNegocio(404, 'El trabajo no existe.')
    }

    const revisores = await validarYObtenerRevisoresSeleccionados(
      idsRevisores,
      transaction
    )

    await ejecutarAsignacionSobreTrabajos({
      trabajos: [trabajo],
      revisores,
      fechaLimiteIso,
      permitirMismaInstitucion,
      justificacionTexto,
      usuarioId,
      transaction,
    })

    const actualizado = await obtenerTrabajoPorIdOCodigo(trabajo.id, { transaction })
    return formatearTrabajoRecibido(actualizado, hoyIso)
  })
}

export async function asignarRevisoresEnLote({ datos = {}, usuarioId }) {
  const {
    trabajoIds,
    codigosTrabajo,
    revisorIds,
    fechaLimite,
    permitirMismaInstitucion,
    justificacion = '',
  } = datos ?? {}

  const tieneIds = Array.isArray(trabajoIds) && trabajoIds.length > 0
  const tieneCodigos = Array.isArray(codigosTrabajo) && codigosTrabajo.length > 0

  if (!tieneIds && !tieneCodigos) {
    throw new ErrorNegocio(
      400,
      'Seleccione al menos un trabajo en trabajoIds o codigosTrabajo para la asignación en lote.'
    )
  }

  const idsNormalizados = tieneIds ? trabajoIds.map(v => String(v ?? '').trim()) : []
  const codigosNormalizados = tieneCodigos
    ? codigosTrabajo.map(v => String(v ?? '').trim())
    : []

  if (!idsNormalizados.every(esEnteroPositivo)) {
    throw new ErrorNegocio(400, 'Todos los elementos de trabajoIds deben ser enteros positivos.')
  }
  if (!codigosNormalizados.every(esIdentificadorTrabajoValido)) {
    throw new ErrorNegocio(400, 'Uno o más códigos en codigosTrabajo no son válidos.')
  }
  if (
    new Set(idsNormalizados.map(Number)).size !== idsNormalizados.length ||
    new Set(codigosNormalizados).size !== codigosNormalizados.length
  ) {
    throw new ErrorNegocio(400, 'No repita trabajos dentro del lote seleccionado.')
  }

  if (typeof justificacion !== 'string') {
    throw new ErrorNegocio(400, 'La justificación debe ser una cadena de texto.')
  }
  if (
    permitirMismaInstitucion !== undefined &&
    typeof permitirMismaInstitucion !== 'boolean'
  ) {
    throw new ErrorNegocio(400, 'El campo permitirMismaInstitucion debe ser booleano.')
  }

  const idsRevisores = normalizarListaRevisorIds(revisorIds)
  const fechaLimiteIso = parsearFechaLimite(fechaLimite)
  const justificacionTexto = justificacion.trim()
  const hoyIso = obtenerFechaHoyLima()

  return ejecutarEnTransaccion(async transaction => {
    const trabajos = await obtenerTrabajosPorIdentificadores(
      {
        ids: idsNormalizados.map(Number),
        codigos: codigosNormalizados,
      },
      { transaction, bloquear: true }
    )

    const cantidadEsperada = idsNormalizados.length + codigosNormalizados.length
    if (trabajos.length < cantidadEsperada) {
      const encontradosIds = new Set(trabajos.map(t => t.id))
      const encontradosCodigos = new Set(trabajos.map(t => t.code))
      const faltantes = [
        ...idsNormalizados.map(Number).filter(id => !encontradosIds.has(id)),
        ...codigosNormalizados.filter(code => !encontradosCodigos.has(code)),
      ]
      if (faltantes.length > 0) {
        throw new ErrorNegocio(
          404,
          `No se encontraron los siguientes trabajos: ${faltantes.join(', ')}.`
        )
      }
    }

    const revisores = await validarYObtenerRevisoresSeleccionados(
      idsRevisores,
      transaction
    )

    const asignacionesCreadas = await ejecutarAsignacionSobreTrabajos({
      trabajos,
      revisores,
      fechaLimiteIso,
      permitirMismaInstitucion,
      justificacionTexto,
      usuarioId,
      transaction,
    })

    const actualizados = await obtenerTrabajosPorIdentificadores(
      { ids: trabajos.map(t => t.id) },
      { transaction }
    )

    return {
      totalTrabajosActualizados: actualizados.length,
      totalAsignacionesCreadas: asignacionesCreadas.length,
      fechaLimite: fechaLimiteIso,
      trabajos: actualizados.map(t => formatearTrabajoRecibido(t, hoyIso)),
    }
  })
}

export async function listarRevisores(filtros = {}) {
  const {
    edicionId,
    linea,
    institucion,
    soloVencidas,
    busqueda,
    q,
    pagina,
    porPagina,
  } = filtros

  let idEdicion = null
  if (edicionId !== undefined && edicionId !== '') {
    if (!esEnteroPositivo(edicionId)) {
      throw new ErrorNegocio(400, 'El identificador de la edición no es válido.')
    }
    idEdicion = Number(edicionId)
  }

  const configPaginacion = parsearPaginacion({ pagina, porPagina }, 8)
  const hoyIso = obtenerFechaHoyLima()
  const filas = await listarRevisoresConRelaciones({ edicionId: idEdicion })

  const todosRevisores = filas.map(revisor =>
    formatearRevisor(revisor, hoyIso, idEdicion)
  )

  const resumen = {
    totalRevisores: todosRevisores.length,
    totalAsignadas: todosRevisores.reduce((acc, r) => acc + r.asignadas, 0),
    totalEntregadas: todosRevisores.reduce((acc, r) => acc + r.entregadas, 0),
    totalVencidas: todosRevisores.reduce((acc, r) => acc + r.vencidas, 0),
    revisoresConVencidas: todosRevisores.filter(r => r.vencidas > 0).length,
  }

  const filtroLinea =
    linea && !['todas', 'todos'].includes(normalizarTexto(linea))
      ? String(linea).trim()
      : null
  const filtroInstitucion =
    institucion && !['todas', 'todos'].includes(normalizarTexto(institucion))
      ? String(institucion).trim()
      : null
  const activarSoloVencidas = ['true', '1', 'si'].includes(
    normalizarTexto(soloVencidas)
  )
  const terminoBusqueda = normalizarTexto(busqueda ?? q ?? '')

  const filtrados = todosRevisores.filter(revisor => {
    if (activarSoloVencidas && revisor.vencidas === 0) {
      return false
    }

    if (filtroLinea) {
      const coincideId =
        esEnteroPositivo(filtroLinea) &&
        revisor.intereses.some(item => item.id === Number(filtroLinea))
      const coincideNombre = revisor.lineasInteres.some(
        nombre => normalizarLineaInteres(nombre) === normalizarLineaInteres(filtroLinea)
      )
      if (!coincideId && !coincideNombre) return false
    }

    if (
      filtroInstitucion &&
      normalizarTexto(revisor.institucion) !== normalizarTexto(filtroInstitucion)
    ) {
      return false
    }

    if (terminoBusqueda) {
      const enNombre = normalizarTexto(revisor.nombre).includes(terminoBusqueda)
      const enCorreo = normalizarTexto(revisor.correo).includes(terminoBusqueda)
      const enInstitucion = normalizarTexto(revisor.institucion).includes(
        terminoBusqueda
      )
      const enLineas = revisor.lineasInteres.some(nombre =>
        normalizarLineaInteres(nombre).includes(normalizarLineaInteres(terminoBusqueda))
      )
      if (!enNombre && !enCorreo && !enInstitucion && !enLineas) return false
    }

    return true
  })

  const { items, paginacion } = aplicarPaginacion(filtrados, configPaginacion)

  return {
    resumen,
    revisores: items,
    paginacion,
  }
}

export async function reasignarRevisor({ asignacionId, datos = {}, usuarioId }) {
  if (!esEnteroPositivo(asignacionId)) {
    throw new ErrorNegocio(400, 'El ID de la asignación no es válido.')
  }

  const {
    nuevoRevisorId,
    motivo = '',
    fechaLimite,
    permitirMismaInstitucion,
    justificacion = '',
  } = datos ?? {}

  if (!esUuidValido(nuevoRevisorId)) {
    throw new ErrorNegocio(400, 'Debe indicar un nuevoRevisorId con formato UUID válido.')
  }
  if (typeof motivo !== 'string' || !motivo.trim()) {
    throw new ErrorNegocio(400, 'El motivo de la reasignación es obligatorio.')
  }
  if (typeof justificacion !== 'string') {
    throw new ErrorNegocio(400, 'La justificación debe ser una cadena de texto.')
  }
  if (
    permitirMismaInstitucion !== undefined &&
    typeof permitirMismaInstitucion !== 'boolean'
  ) {
    throw new ErrorNegocio(400, 'El campo permitirMismaInstitucion debe ser booleano.')
  }

  const fechaExplicita =
    fechaLimite !== undefined && fechaLimite !== null && String(fechaLimite).trim() !== ''
      ? parsearFechaLimite(fechaLimite)
      : null

  const motivoLimpio = motivo.trim()
  const justificacionLimpia = justificacion.trim()
  const hoyIso = obtenerFechaHoyLima()

  return ejecutarEnTransaccion(async transaction => {
    const asignacionActual = await obtenerAsignacionPorId(Number(asignacionId), {
      transaction,
      bloquear: true,
    })
    if (!asignacionActual) {
      throw new ErrorNegocio(404, 'La asignación indicada no existe.')
    }

    const trabajo = asignacionActual.work
    validarTrabajoAptoParaAsignacion(trabajo)

    if (asignacionActual.review?.status === 'submitted') {
      throw new ErrorNegocio(
        409,
        'No se puede reasignar una revisión cuya evaluación ya fue enviada.'
      )
    }

    const idNuevoNormalizado = nuevoRevisorId.trim().toLowerCase()
    if (asignacionActual.reviewerId.toLowerCase() === idNuevoNormalizado) {
      throw new ErrorNegocio(400, 'Debe seleccionar un revisor distinto al actual.')
    }

    const [nuevoRevisor] = await validarYObtenerRevisoresSeleccionados(
      [nuevoRevisorId.trim()],
      transaction
    )

    const yaAsignado = (trabajo.assignments ?? []).some(
      item =>
        item.id !== asignacionActual.id &&
        item.reviewerId.toLowerCase() === idNuevoNormalizado
    )
    if (yaAsignado) {
      throw new ErrorNegocio(
        409,
        `El revisor ${nuevoRevisor.fullName} ya se encuentra asignado al trabajo ${trabajo.code}.`
      )
    }

    const conflicto = evaluarConflictoRevisor(nuevoRevisor, trabajo)
    if (conflicto.tipo === 'coautor') {
      throw new ErrorNegocio(
        409,
        `Conflicto por coautoría: ${nuevoRevisor.fullName} figura como autor o coautor del trabajo ${trabajo.code}. No es posible asignar a un coautor.`
      )
    }

    let justificacionConflicto = null
    if (conflicto.tipo === 'institucion') {
      if (permitirMismaInstitucion === false || (!justificacionLimpia && permitirMismaInstitucion !== true)) {
        throw new ErrorNegocio(
          409,
          `Conflicto de institución detectado: ${nuevoRevisor.fullName} pertenece a la misma institución del autor de correspondencia (${conflicto.institucion}). Confirme la excepción e ingrese la justificación del comité.`
        )
      }
      justificacionConflicto = justificacionLimpia || motivoLimpio
    }

    const fechaLimiteFinal = fechaExplicita ?? asignacionActual.dueDate
    const revisorAnterior = asignacionActual.reviewer

    await eliminarAsignacion(asignacionActual, transaction)

    const nuevaAsignacion = await crearAsignacionConBorrador(
      {
        workId: trabajo.id,
        reviewerId: nuevoRevisor.id,
        dueDate: fechaLimiteFinal,
        conflictJustification: justificacionConflicto,
      },
      transaction
    )
    nuevaAsignacion.reviewer = nuevoRevisor

    const registroHistorial = await registrarHistorialAsignacion(
      {
        workId: trabajo.id,
        action: 'reassigned',
        reviewerId: nuevoRevisor.id,
        previousReviewerId: revisorAnterior?.id ?? asignacionActual.reviewerId,
        performedById: usuarioId,
        reason: motivoLimpio,
        conflictJustification: justificacionConflicto,
        dueDate: fechaLimiteFinal,
      },
      transaction
    )

    return {
      asignacion: formatearAsignacionResumen(nuevaAsignacion, hoyIso),
      trabajo: {
        id: trabajo.id,
        codigo: trabajo.code,
        titulo: trabajo.title,
      },
      revisorAnterior: resumirParticipante(revisorAnterior),
      nuevoRevisor: resumirParticipante(nuevoRevisor),
      motivo: motivoLimpio,
      historialId: registroHistorial.id,
    }
  })
}

export async function retirarRevisor({ asignacionId, motivo = '', usuarioId }) {
  if (!esEnteroPositivo(asignacionId)) {
    throw new ErrorNegocio(400, 'El ID de la asignación no es válido.')
  }
  if (typeof motivo !== 'string' || !motivo.trim()) {
    throw new ErrorNegocio(400, 'El motivo del retiro es obligatorio.')
  }

  const motivoLimpio = motivo.trim()

  return ejecutarEnTransaccion(async transaction => {
    const asignacion = await obtenerAsignacionPorId(Number(asignacionId), {
      transaction,
      bloquear: true,
    })
    if (!asignacion) {
      throw new ErrorNegocio(404, 'La asignación indicada no existe.')
    }

    const trabajo = asignacion.work
    validarTrabajoAptoParaAsignacion(trabajo)

    if (asignacion.review?.status === 'submitted') {
      throw new ErrorNegocio(
        409,
        'No se puede retirar a un revisor cuya evaluación ya fue enviada.'
      )
    }

    const revisorRetirado = asignacion.reviewer
    const fechaLimitePrev = asignacion.dueDate

    await eliminarAsignacion(asignacion, transaction)

    const restantes = await contarAsignacionesTrabajo(trabajo.id, transaction)
    let estadoTrabajoActualizado = trabajo.status
    if (restantes === 0 && trabajo.status === 'under_review') {
      await actualizarEstadoTrabajo(trabajo, 'submitted', transaction)
      estadoTrabajoActualizado = 'submitted'
    }

    const registroHistorial = await registrarHistorialAsignacion(
      {
        workId: trabajo.id,
        action: 'removed',
        reviewerId: null,
        previousReviewerId: revisorRetirado?.id ?? asignacion.reviewerId,
        performedById: usuarioId,
        reason: motivoLimpio,
        conflictJustification: null,
        dueDate: fechaLimitePrev,
      },
      transaction
    )

    return {
      trabajo: {
        id: trabajo.id,
        codigo: trabajo.code,
        titulo: trabajo.title,
        estado: etiquetasEstadoTrabajo[estadoTrabajoActualizado] ?? estadoTrabajoActualizado,
        revisoresRestantes: restantes,
      },
      revisorRetirado: resumirParticipante(revisorRetirado),
      motivo: motivoLimpio,
      historialId: registroHistorial.id,
    }
  })
}

export async function obtenerHistorialTrabajo(identificadorTrabajo) {
  if (!esIdentificadorTrabajoValido(identificadorTrabajo)) {
    throw new ErrorNegocio(400, 'El identificador del trabajo no es válido.')
  }

  const trabajo = await obtenerTrabajoPorIdOCodigo(identificadorTrabajo)
  if (!trabajo) {
    throw new ErrorNegocio(404, 'El trabajo no existe.')
  }

  const registros = await listarHistorialPorTrabajo(trabajo.id)

  return {
    trabajo: {
      id: trabajo.id,
      codigo: trabajo.code,
      titulo: trabajo.title,
    },
    historial: registros.map(item => ({
      id: item.id,
      accion: accionesHistorialPublicas[item.action] ?? item.action,
      motivo: item.reason ?? null,
      justificacionConflicto: item.conflictJustification ?? null,
      fechaLimite: item.dueDate,
      revisor: resumirParticipante(item.reviewer),
      revisorAnterior: resumirParticipante(item.previousReviewer),
      registradoPor: resumirParticipante(item.performedBy),
      fechaRegistro: item.createdAt,
    })),
  }
}

export async function listarSeguimientoRevisiones(filtros = {}) {
  const { edicionId, soloVencidas, pagina, porPagina } = filtros

  let idEdicion = null
  if (edicionId !== undefined && edicionId !== '') {
    if (!esEnteroPositivo(edicionId)) {
      throw new ErrorNegocio(400, 'El identificador de la edición no es válido.')
    }
    idEdicion = Number(edicionId)
  }

  const configPaginacion = parsearPaginacion({ pagina, porPagina }, 6)
  const hoyIso = obtenerFechaHoyLima()

  const [edicion, asignaciones] = await Promise.all([
    obtenerEdicionVigente(idEdicion),
    listarAsignacionesSeguimiento({ edicionId: idEdicion }),
  ])

  const entregadas = asignaciones.filter(
    item => item.review?.status === 'submitted'
  ).length

  const pendientesBase = asignaciones
    .filter(
      item =>
        item.review?.status !== 'submitted' &&
        !item.reviewer?.blocked &&
        !['accepted', 'rejected', 'draft'].includes(item.work?.status)
    )
    .map(item => {
      const diferenciaDias = calcularDiferenciaDias(item.dueDate, hoyIso)
      const esVencida = diferenciaDias < 0
      const magnitudDias = Math.abs(diferenciaDias)
      const palabraDia = magnitudDias === 1 ? 'día' : 'días'

      let etiquetaEstado
      if (esVencida) {
        etiquetaEstado = `Vencida · ${magnitudDias} ${palabraDia}`
      } else if (diferenciaDias === 0) {
        etiquetaEstado = 'Pendiente · vence hoy'
      } else {
        etiquetaEstado = `Pendiente · ${magnitudDias} ${palabraDia}`
      }

      const recordatorios = [...(item.reminders ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      return {
        asignacionId: item.id,
        trabajoId: item.work.id,
        codigo: item.work.code,
        trabajo: item.work.title,
        eje: item.work.thematicAxis?.name ?? '',
        tipo: item.work.workType?.name ?? '',
        revisorId: item.reviewer.id,
        revisor: item.reviewer.fullName,
        revisorCorreo: item.reviewer.email,
        fechaLimite: item.dueDate,
        fechaLimiteTexto: formatearFechaPublica(item.dueDate),
        esVencida,
        diasDiferencia: diferenciaDias,
        estado: esVencida ? 'vencida' : 'pendiente',
        etiquetaEstado,
        accionSugerida: esVencida ? 'reasignar' : 'recordar',
        recordatoriosEnviados: recordatorios.length,
        ultimoRecordatorio: recordatorios[0]?.createdAt ?? null,
      }
    })
    .sort((a, b) => {
      if (a.esVencida !== b.esVencida) {
        return a.esVencida ? -1 : 1
      }
      const porFecha = a.fechaLimite.localeCompare(b.fechaLimite)
      if (porFecha !== 0) return porFecha
      const porCodigo = a.codigo.localeCompare(b.codigo)
      return porCodigo !== 0 ? porCodigo : a.asignacionId - b.asignacionId
    })

  const totalVencidas = pendientesBase.filter(item => item.esVencida).length
  const totalEnPlazo = pendientesBase.length - totalVencidas

  const activarSoloVencidas = ['true', '1', 'si'].includes(
    normalizarTexto(soloVencidas)
  )
  const listaFiltrada = activarSoloVencidas
    ? pendientesBase.filter(item => item.esVencida)
    : pendientesBase

  const { items, paginacion } = aplicarPaginacion(listaFiltrada, configPaginacion)

  const cierreRevisionIso = edicion?.reviewDeadline
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(edicion.reviewDeadline))
    : null

  return {
    cierreEtapaRevision: cierreRevisionIso,
    cierreEtapaRevisionTexto: cierreRevisionIso
      ? formatearFechaPublica(cierreRevisionIso)
      : null,
    alertaVencidas: {
      activa: totalVencidas > 0,
      cantidad: totalVencidas,
      mensaje:
        totalVencidas > 0
          ? `${totalVencidas} ${
              totalVencidas === 1 ? 'revisión vencida' : 'revisiones vencidas'
            }. Considere reasignar para no retrasar la publicación de resultados.`
          : null,
    },
    resumen: {
      totalAsignadas: asignaciones.length,
      entregadas,
      pendientesEnPlazo: totalEnPlazo,
      vencidas: totalVencidas,
    },
    pendientes: items,
    paginacion,
  }
}

export async function registrarRecordatorioIndividual({ asignacionId, usuarioId }) {
  if (!esEnteroPositivo(asignacionId)) {
    throw new ErrorNegocio(400, 'El ID de la asignación no es válido.')
  }

  return ejecutarEnTransaccion(async transaction => {
    const asignacion = await obtenerAsignacionPorId(Number(asignacionId), {
      transaction,
      bloquear: true,
    })
    if (!asignacion) {
      throw new ErrorNegocio(404, 'La asignación indicada no existe.')
    }
    if (asignacion.review?.status === 'submitted') {
      throw new ErrorNegocio(
        409,
        'La evaluación ya fue enviada; no requiere recordatorio.'
      )
    }
    if (asignacion.reviewer?.blocked) {
      throw new ErrorNegocio(
        409,
        'El revisor tiene la cuenta bloqueada; reasigne la revisión.'
      )
    }

    const [creado] = await crearRecordatorios(
      [{ assignmentId: asignacion.id, sentById: usuarioId }],
      transaction
    )

    return {
      id: creado.id,
      asignacionId: asignacion.id,
      codigo: asignacion.work.code,
      revisor: resumirParticipante(asignacion.reviewer),
      fechaEnvio: creado.createdAt,
    }
  })
}

export async function registrarRecordatoriosPendientes({ datos = {}, usuarioId }) {
  const { asignacionIds, soloVencidas, edicionId } = datos ?? {}

  let idEdicion = null
  if (edicionId !== undefined && edicionId !== '') {
    if (!esEnteroPositivo(edicionId)) {
      throw new ErrorNegocio(400, 'El identificador de la edición no es válido.')
    }
    idEdicion = Number(edicionId)
  }

  let filtroIds = null
  if (asignacionIds !== undefined) {
    if (!Array.isArray(asignacionIds) || asignacionIds.length === 0) {
      throw new ErrorNegocio(
        400,
        'El campo asignacionIds debe ser un arreglo no vacío de enteros positivos.'
      )
    }
    if (!asignacionIds.every(esEnteroPositivo)) {
      throw new ErrorNegocio(
        400,
        'Todos los elementos de asignacionIds deben ser enteros positivos.'
      )
    }
    filtroIds = new Set(asignacionIds.map(Number))
  }

  const hoyIso = obtenerFechaHoyLima()
  const filtrarVencidas = soloVencidas === true || normalizarTexto(soloVencidas) === 'true'

  return ejecutarEnTransaccion(async transaction => {
    const asignaciones = await listarAsignacionesSeguimiento({ edicionId: idEdicion })

    const elegibles = asignaciones.filter(item => {
      if (filtroIds && !filtroIds.has(item.id)) return false
      if (item.review?.status === 'submitted') return false
      if (item.reviewer?.blocked) return false
      if (['accepted', 'rejected', 'draft'].includes(item.work?.status)) return false
      if (filtrarVencidas && !(item.dueDate < hoyIso)) return false
      return true
    })

    if (filtroIds && elegibles.length !== filtroIds.size) {
      throw new ErrorNegocio(
        409,
        'Una o más asignaciones indicadas no existen o ya no se encuentran pendientes.'
      )
    }

    if (elegibles.length === 0) {
      return {
        totalEnviados: 0,
        recordatorios: [],
      }
    }

    const creados = await crearRecordatorios(
      elegibles.map(item => ({
        assignmentId: item.id,
        sentById: usuarioId,
      })),
      transaction
    )

    return {
      totalEnviados: creados.length,
      recordatorios: creados.map((registro, indice) => ({
        id: registro.id,
        asignacionId: elegibles[indice].id,
        codigo: elegibles[indice].work.code,
        revisor: resumirParticipante(elegibles[indice].reviewer),
        fechaEnvio: registro.createdAt,
      })),
    }
  })
}
