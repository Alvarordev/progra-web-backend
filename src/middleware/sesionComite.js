import { randomBytes } from 'node:crypto'
import { Usuario } from '../models/index.js'
import { autenticar } from './autenticacion.js'

const nombreCookie = 'congreso_comite'
const sesiones = new Map()
const hora = 60 * 60 * 1000

setInterval(() => {
  const ahora = Date.now()
  for (const [token, sesion] of sesiones) {
    if (sesion.vence <= ahora) sesiones.delete(token)
  }
}, hora).unref()

function tokenSesion(req) {
  const cookie = req.headers.cookie?.split(';').map(parte => parte.trim())
    .find(parte => parte.startsWith(`${nombreCookie}=`))
  return cookie?.slice(nombreCookie.length + 1)
}

function opcionesCookie(req) {
  return { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/api' }
}

function vistaUsuario(usuario) {
  return {
    userId: usuario.id,
    names: usuario.names,
    surnames: usuario.surnames,
    name: usuario.fullName,
    email: usuario.email,
    institution: usuario.institution,
    role: usuario.role,
  }
}

export async function iniciarSesionComite(req, res) {
  const recordar = req.body?.recordar === true
  const vigencia = recordar ? 7 * 24 * hora : 8 * hora
  const usuario = await Usuario.findByPk(res.locals.usuario.id)
  if (!usuario || usuario.blocked || usuario.role !== 'committee') {
    return res.status(403).json({ status: 'error', mensaje: 'Cuenta de comité requerida.' })
  }
  sesiones.delete(tokenSesion(req))
  const token = randomBytes(32).toString('base64url')
  sesiones.set(token, { usuarioId: usuario.id, vence: Date.now() + vigencia })
  res.set('Cache-Control', 'no-store')
  res.cookie(nombreCookie, token, { ...opcionesCookie(req), ...(recordar && { maxAge: vigencia }) })
  return res.status(201).json({ status: 'success', data: vistaUsuario(usuario) })
}

async function usuarioConSesion(req) {
  const token = tokenSesion(req)
  const sesion = sesiones.get(token)
  if (!sesion) return null
  if (sesion.vence > Date.now()) {
    const usuario = await Usuario.findByPk(sesion.usuarioId)
    if (usuario?.role === 'committee' && !usuario.blocked) return usuario
  }
  sesiones.delete(token)
  return null
}

export async function consultarSesionComite(req, res) {
  const usuario = await usuarioConSesion(req)
  res.set('Cache-Control', 'no-store')
  if (!usuario) return res.status(401).json({ status: 'error', mensaje: 'Inicia sesión como comité.' })
  return res.json({ status: 'success', data: vistaUsuario(usuario) })
}

export function cerrarSesionComite(req, res) {
  sesiones.delete(tokenSesion(req))
  res.clearCookie(nombreCookie, opcionesCookie(req))
  return res.status(204).end()
}

export async function autenticarConfiguracion(req, res, next) {
  if (req.get('Authorization')) return autenticar(req, res, next)
  const usuario = await usuarioConSesion(req)
  if (!usuario) return res.status(401).json({ status: 'error', mensaje: 'Inicia sesión como comité para guardar.' })
  res.locals.usuario = { id: usuario.id, rol: usuario.role }
  return next()
}
