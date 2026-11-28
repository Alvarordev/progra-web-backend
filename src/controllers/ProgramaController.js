import * as programa from '../services/programa.js'

function responder(operacion, codigo = 200) {
  return async (req, res, next) => {
    try {
      const data = await operacion(req, res)
      return res.status(codigo).json({ status: 'success', data })
    } catch (error) {
      return next(error)
    }
  }
}

export const obtenerProgramaPublico = responder(req => programa.obtenerProgramaPublico(req.query))
export const obtenerGestionPrograma = responder(req => programa.obtenerGestionPrograma(req.query))
export const crearSesion = responder(req => programa.crearSesion(req.body), 201)
export const actualizarSesion = responder(req => programa.actualizarSesion(req.params.id, req.body))
export const eliminarSesion = responder(req => programa.eliminarSesion(req.params.id))
export const asignarTrabajos = responder(req => programa.asignarTrabajos(req.params.id, req.body))
export const publicarPrograma = responder(req => programa.publicarPrograma(req.body))
export const obtenerMiPresentacion = responder((req, res) =>
  programa.obtenerMiPresentacion(res.locals.usuario.id, req.query)
)
