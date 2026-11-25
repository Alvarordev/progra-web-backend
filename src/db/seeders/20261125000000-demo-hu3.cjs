const { basename } = require('node:path');
const { cargarDemo, passwordDemo, revertirDemo } = require('../demo/registrar.cjs');

const ejes = [
  'Inteligencia artificial y datos',
  'Ingeniería de software',
  'Sostenibilidad y ciudad',
  'Innovación y emprendimiento',
  'Salud y sociedad',
  'Economía y mercados',
];

// [nombre, extensión máxima, formato, máximo de coautores]
const tipos = [
  ['Artículo completo', '8 000 palabras', 'PDF · plantilla IEEE', 4],
  ['Resumen extendido', '2 000 palabras', 'PDF', 3],
  ['Póster', '1 lámina A1', 'PDF · orientación vertical', 3],
  ['Caso de estudio', '5 000 palabras', 'PDF', 4],
];

// [nombres, apellidos, correo]
const autores = [
  ['Rosa María', 'Quispe Ttito', 'rosa.quispe@aloe.ulima.edu.pe'],
  ['Diego Alonso', 'Chávez Manrique', 'diego.chavez@aloe.ulima.edu.pe'],
];

module.exports = {
  async up(query) {
    const password = passwordDemo();
    const { crearHash } = await import('../../services/password.js');
    const { Usuario, Edicion, EjeTematico, TipoTrabajo } = await import('../../models/index.js');

    await cargarDemo(query, basename(__filename), async ({ buscarOCrear }) => {
      for (const [names, surnames, email] of autores) {
        await buscarOCrear(Usuario, { email }, {
          names, surnames, role: 'author', institution: 'Universidad de Lima',
          acceptedTerms: true, passwordHash: await crearHash(password),
        });
      }

      const [edicion] = await buscarOCrear(Edicion, { year: 2027 }, {
        name: 'Congreso Académico Estudiantil (demo HU3)', venue: 'Universidad de Lima',
        status: 'reception_open',
        receptionDeadline: '2027-09-30T23:59:00-05:00',
        reviewDeadline: '2027-10-15T23:59:00-05:00',
        publicationDate: '2027-10-28T09:00:00-05:00',
      });
      const editionId = edicion.id;
      for (const name of ejes) {
        await buscarOCrear(EjeTematico, { editionId, name }, {
          description: name, coordinator: 'Dra. Ana Salazar Bermúdez',
        });
      }
      for (const [name, maxLength, expectedFormat, maxCoauthors] of tipos) {
        await buscarOCrear(TipoTrabajo, { editionId, name }, {
          maxLength, expectedFormat, allowsCoauthors: true, maxCoauthors,
        });
      }
    });
  },

  async down(query) {
    await revertirDemo(query, basename(__filename));
  },
};
