const { basename } = require('node:path');
const { cargarDemo, revertirDemo } = require('../demo/registrar.cjs');
const { anioEdicionDemo } = require('../demo/edicion.cjs');

const salasDemo = [
  ['A-101', 'Edificio A, primer piso'],
  ['B-201', 'Edificio B, segundo piso'],
  ['C-305', 'Edificio C, tercer piso'],
];

// [nombre, eje, fecha, inicio, fin, sala, correo del moderador]
const sesionesDemo = [
  ['Inteligencia artificial aplicada', 'Inteligencia artificial y datos', '2027-03-10', '09:00', '10:30', 'A-101', 'ana.salazar@ulima.edu.pe'],
  ['Sostenibilidad y ciudad', 'Sostenibilidad y ciudad', '2027-03-10', '11:00', '12:30', 'B-201', 'carmen.effio@ulima.edu.pe'],
  ['Innovación y emprendimiento', 'Innovación y emprendimiento', '2027-03-11', '11:00', '12:30', 'B-201', 'jorge.palomino@ulima.edu.pe'],
  ['Salud y sociedad', 'Salud y sociedad', '2027-03-11', '11:00', '12:30', 'C-305', 'milagros.yupanqui@ulima.edu.pe'],
];

// Requiere los datos de ejemplo de HU4/HU5 (edición 2026, usuarios y ejes).
module.exports = {
  async up(query) {
    const { Edicion, EjeTematico, Sala, SesionPrograma, Trabajo, TrabajoSesion, Usuario } =
      await import('../../models/index.js');

    await cargarDemo(query, basename(__filename), async ({ crear, buscarOCrear }) => {
      const edicion = await Edicion.findOne({ where: { year: anioEdicionDemo } });
      if (!edicion) throw new Error('Cargue antes los datos de ejemplo de la HU4 o la HU5 (edición 2026).');

      const salas = new Map();
      for (const [code, location] of salasDemo) {
        const [sala] = await buscarOCrear(Sala, { code }, { location });
        salas.set(code, sala);
      }

      for (const [name, eje, date, startTime, endTime, codigoSala, correo] of sesionesDemo) {
        const [axis, moderator] = await Promise.all([
          EjeTematico.findOne({ where: { editionId: edicion.id, name: eje } }),
          Usuario.findOne({ where: { email: correo } }),
        ]);
        if (!axis || !moderator) continue;
        const [sesion, creada] = await buscarOCrear(SesionPrograma, { editionId: edicion.id, name }, {
          date,
          startTime,
          endTime,
          roomId: salas.get(codigoSala).id,
          thematicAxisId: axis.id,
          moderatorId: moderator.id,
        });

        // Los trabajos aceptados del eje quedan en su sesión, en orden de código.
        if (!creada) continue;
        const aceptados = await Trabajo.findAll({
          where: { editionId: edicion.id, status: 'accepted', thematicAxisId: axis.id },
          order: [['code', 'ASC']],
        });
        for (const [indice, trabajo] of aceptados.entries()) {
          await crear(TrabajoSesion, { sessionId: sesion.id, workId: trabajo.id, position: indice + 1 });
        }
      }
    });
  },

  async down(query) {
    await revertirDemo(query, basename(__filename));
  },
};
