import * as usuarios from '../services/gestionUsuarios.js'

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

export const listarUsuarios = responder(req => usuarios.listarUsuarios(req.query))
export const invitarUsuario = responder(req => usuarios.invitarUsuario(req.body), 201)
export const actualizarUsuario = responder((req, res) =>
  usuarios.actualizarUsuario(req.params.id, req.body, res.locals.usuario.id)
)
export const bloquearUsuario = responder((req, res) =>
  usuarios.bloquearUsuario(req.params.id, req.body, res.locals.usuario.id)
)
export const reactivarUsuario = responder(req => usuarios.reactivarUsuario(req.params.id))
