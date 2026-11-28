const { basename } = require('node:path');
const { cargarDemo, passwordDemo, revertirDemo } = require('../demo/registrar.cjs');
const { anioEdicionDemo, datosEdicionDemo, crearTiposTrabajoDemo } = require('../demo/edicion.cjs');

const ejes = [
  'Inteligencia artificial y datos',
  'Ingeniería de software',
  'Sostenibilidad y ciudad',
  'Innovación y emprendimiento',
  'Salud y sociedad',
  'Economía y mercados',
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

      const [edicion] = await buscarOCrear(Edicion, { year: anioEdicionDemo }, datosEdicionDemo);
      const editionId = edicion.id;
      for (const name of ejes) {
        await buscarOCrear(EjeTematico, { editionId, name }, {
          description: name, coordinator: 'Dra. Ana Salazar Bermúdez',
        });
      }
      await crearTiposTrabajoDemo(TipoTrabajo, editionId, buscarOCrear);
    });
  },

  async down(query) {
    await revertirDemo(query, basename(__filename));
  },
};
