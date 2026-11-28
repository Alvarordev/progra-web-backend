const anioEdicionDemo = 2026;

const datosEdicionDemo = {
  name: 'Congreso Académico Estudiantil 2026',
  venue: 'Universidad de Lima',
  status: 'reception_open',
  receptionDeadline: '2026-12-18T23:59:00-05:00',
  reviewDeadline: '2027-01-29T23:59:00-05:00',
  publicationDate: '2027-02-12T09:00:00-05:00',
};

const tiposTrabajoDemo = [
  ['Artículo completo', '8 000 palabras', 'PDF · plantilla IEEE', true, 4],
  ['Resumen extendido', '2 500 palabras', 'PDF', true, 3],
  ['Póster', '1 lámina A1', 'PDF · orientación vertical', true, 5],
  ['Caso de estudio', '5 000 palabras', 'PDF', false, null],
];

async function crearTiposTrabajoDemo(TipoTrabajo, editionId, buscarOCrear) {
  const tipos = new Map();
  for (const [name, maxLength, expectedFormat, allowsCoauthors, maxCoauthors] of tiposTrabajoDemo) {
    const [tipo] = await buscarOCrear(TipoTrabajo, { editionId, name }, {
      maxLength, expectedFormat, allowsCoauthors, maxCoauthors,
    });
    tipos.set(name, tipo);
  }
  return tipos;
}

module.exports = { anioEdicionDemo, datosEdicionDemo, tiposTrabajoDemo, crearTiposTrabajoDemo };
