// Orígenes permitidos, separados por coma. Admiten «*» como comodín dentro del host,
// por ejemplo https://mi-app-*.vercel.app para las vistas previas de Vercel.
const patrones = (process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origen => origen.trim().replace(/\/$/, ''))
  .filter(Boolean)
  .map(origen => new RegExp(`^${origen.split('*').map(parte => parte.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]*')}$`, 'i'))

const origenPermitido = origen => patrones.some(patron => patron.test(origen))

export function cors(req, res, next) {
  res.vary('Origin')
  const origen = req.get('Origin')
  if (!origen) return next()
  if (!origenPermitido(origen)) {
    return res.status(403).json({ status: 'error', mensaje: 'Origen no permitido.' })
  }

  res.set('Access-Control-Allow-Origin', origen)
  res.set('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS' && req.get('Access-Control-Request-Method')) {
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    return res.status(204).end()
  }

  return next()
}
