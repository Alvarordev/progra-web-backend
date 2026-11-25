import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derivar = promisify(scrypt)
const longitud = 64

export async function crearHash(password) {
  const sal = randomBytes(16).toString('hex')
  const clave = await derivar(password, sal, longitud)
  return `scrypt:${sal}:${clave.toString('hex')}`
}

export async function verificarPassword(password, hash) {
  const [, sal, clave] = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(hash ?? '') ?? []
  const calculada = await derivar(password, sal ?? '0'.repeat(32), longitud)
  return Boolean(clave && timingSafeEqual(calculada, Buffer.from(clave, 'hex')))
}
