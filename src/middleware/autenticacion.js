import { Usuario } from '../models/index.js'
import { verificarPassword } from '../services/password.js'

export async function autenticar(req, res, next) {
  const encabezado = req.get('Authorization') ?? ''
  const token = encabezado.length <= 2048 && /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(encabezado)?.[1]
  if (token) {
    const credenciales = Buffer.from(token, 'base64').toString('utf8')
    const separador = credenciales.indexOf(':')
    if (separador > 0) {
      const email = credenciales.slice(0, separador).trim().toLowerCase()
      const password = credenciales.slice(separador + 1)
      const usuario = await Usuario.scope('withPassword').findOne({
        where: { email },
        attributes: ['id', 'role', 'blocked', 'passwordHash'],
      })
      const valido = await verificarPassword(password, usuario?.passwordHash)
      if (valido && !usuario.blocked) {
        res.locals.usuario = { id: usuario.id, rol: usuario.role }
        return next()
      }
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Congreso", charset="UTF-8"')
  return res.status(401).json({ status: 'error', mensaje: 'Se requiere una cuenta válida.' })
}

export function permitirRoles(...roles) {
  return (req, res, next) => {
    if (roles.includes(res.locals.usuario.rol)) return next()
    return res.status(403).json({ status: 'error', mensaje: 'No tienes acceso a esta operación.' })
  }
}
