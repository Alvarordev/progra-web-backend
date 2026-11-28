import { ErrorUsuario } from './validacionesUsuario.js'
import { validarEdicionId } from './validacionesGestionUsuario.js'
import { calcularCumplimiento, calcularMetricas } from './calculosMetricas.js'
import * as repositorio from '../repositories/metricasRepository.js'

async function obtenerEdicionConsultada(consulta) {
  const edicion = await repositorio.obtenerEdicion(validarEdicionId(consulta?.edicionId))
  if (!edicion) throw new ErrorUsuario('La edición consultada no existe.', 404)
  return { id: edicion.id, nombre: edicion.name, anio: edicion.year }
}

export async function consultarMetricas(consulta) {
  const edicion = await obtenerEdicionConsultada(consulta)
  const [trabajos, ejes, asignaciones] = await Promise.all([
    repositorio.listarTrabajosDeEdicion(edicion.id),
    repositorio.listarEjesDeEdicion(edicion.id),
    repositorio.listarAsignacionesDeEdicion(edicion.id),
  ])
  return {
    edicion,
    generadoEn: new Date().toISOString(),
    ...calcularMetricas({ trabajos, ejes, asignaciones }),
  }
}

export async function consultarCumplimientoRevisores(consulta) {
  const edicion = await obtenerEdicionConsultada(consulta)
  const [asignaciones, totalRevisores] = await Promise.all([
    repositorio.listarAsignacionesDeEdicion(edicion.id),
    repositorio.contarRevisoresActivos(),
  ])
  return {
    edicion,
    generadoEn: new Date().toISOString(),
    ...calcularCumplimiento({ asignaciones, totalRevisores }),
  }
}
