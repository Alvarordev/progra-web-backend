import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from 'sequelize'
import {
  actualizarEdicion,
  consultarEdicion,
  eliminarCatalogo,
  ErrorEdicion,
  guardarCatalogo,
  listarCatalogo,
  listarEdiciones,
} from '../services/ediciones.js'

function responder(operacion, codigo = 200) {
  return async (req, res, next) => {
    try {
      const data = await operacion(req)
      if (codigo === 204) return res.status(codigo).end()
      return res.status(codigo).json({ status: 'success', data })
    } catch (error) {
      if (error instanceof ErrorEdicion) {
        return res.status(error.codigo).json({ status: 'error', mensaje: error.message })
      }
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({ status: 'error', mensaje: 'Ya existe un registro con estos datos.' })
      }
      if (error instanceof ForeignKeyConstraintError) {
        return res.status(409).json({ status: 'error', mensaje: 'El registro está en uso y no se puede eliminar.' })
      }
      if (error instanceof ValidationError) {
        return res.status(400).json({ status: 'error', mensaje: error.errors[0]?.message ?? 'Datos no válidos.' })
      }
      return next(error)
    }
  }
}

export const listaEdiciones = responder(listarEdiciones)
export const detalleEdicion = responder(req => consultarEdicion(req.params.edicionId))
export const guardarEdicion = responder(req => actualizarEdicion(req.params.edicionId, req.body))
export const listaCatalogo = tipo => responder(req => listarCatalogo(tipo, req.params.edicionId))
export const crearElemento = tipo => responder(req => guardarCatalogo(tipo, req.params.edicionId, req.body), 201)
export const actualizarElemento = tipo => responder(req => guardarCatalogo(tipo, req.params.edicionId, req.body, req.params.id))
export const eliminarElemento = tipo => responder(req => eliminarCatalogo(tipo, req.params.edicionId, req.params.id), 204)
