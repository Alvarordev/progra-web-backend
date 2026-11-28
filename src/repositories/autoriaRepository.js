import { Op } from 'sequelize'
import { AutorTrabajo, Trabajo, Usuario } from '../models/index.js'

// Trabajos que una persona puede consultar como autora:
// - propios: los que registró, en cualquier estado (incluidos sus borradores)
// - coautoria: aquellos donde figura como coautora por cuenta o por correo.
//   Los borradores son privados de quien los registró hasta que se envían.
export async function listarIdsTrabajosDelAutor(usuarioId) {
  const usuario = await Usuario.findByPk(usuarioId, { attributes: ['id', 'email'] })
  const [propios, coautorias] = await Promise.all([
    Trabajo.findAll({ where: { ownerId: usuarioId }, attributes: ['id'], raw: true }),
    AutorTrabajo.findAll({
      where: { [Op.or]: [{ userId: usuarioId }, { email: usuario?.email ?? '' }] },
      attributes: ['workId'],
      include: [{ model: Trabajo, attributes: [], where: { status: { [Op.ne]: 'draft' } }, required: true }],
      raw: true,
    }),
  ])
  const ids = {
    propios: new Set(propios.map(trabajo => trabajo.id)),
    coautoria: new Set(coautorias.map(fila => fila.workId)),
  }
  ids.todos = new Set([...ids.propios, ...ids.coautoria])
  return ids
}
