const origenes = new Set(
  (process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(origen => origen.trim())
    .filter(Boolean)
)

export function cors(req, res, next) {
  res.vary('Origin')
  const origen = req.get('Origin')
  if (!origen) return next()
  if (!origenes.has(origen)) {
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
