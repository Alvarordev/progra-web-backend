const { basename } = require('node:path');
const { cargarDemo, passwordDemo, revertirDemo } = require('../demo/registrar.cjs');
const { anioEdicionDemo, datosEdicionDemo, crearTiposTrabajoDemo } = require('../demo/edicion.cjs');

const usuarios = [
  ['Rosa María', 'Quispe Ttito', 'rosa.quispe@aloe.ulima.edu.pe', 'author'],
  ['Diego Alonso', 'Chávez Manrique', 'diego.chavez@aloe.ulima.edu.pe', 'author'],
  ['Mg. Luis', 'Ramírez Cárdenas', 'luis.ramirez@ulima.edu.pe', 'reviewer'],
  ['Dr. Óscar', 'Nakamura Trigoso', 'onakamura@pucp.edu.pe', 'reviewer', 'Pontificia Universidad Católica'],
  ['Mg. Carmen', 'Effio Vargas', 'carmen.effio@ulima.edu.pe', 'reviewer'],
  ['Dra. Ana', 'Salazar Bermúdez', 'ana.salazar@ulima.edu.pe', 'committee'],
];
const criterios = [
  ['Originalidad', 'Aporte novedoso frente a la literatura consultada.', 25],
  ['Rigor metodológico', 'Coherencia del diseño, los datos y el análisis.', 30],
  ['Claridad de la exposición', 'Redacción, estructura y calidad de las figuras.', 20],
  ['Relevancia y aporte', 'Pertinencia para el eje temático y utilidad práctica.', 25],
];
const trabajos = [
  ['TRB-2026-042', 'Predicción de deserción universitaria mediante aprendizaje supervisado', 0, 0, 'under_review'],
  ['TRB-2026-051', 'Evaluación del uso de agua reciclada en riego de áreas verdes del campus', 0, 1, 'accepted'],
  ['TRB-2026-057', 'Tablero de indicadores para la gestión de residuos sólidos en Surco', 1, 1, 'rejected'],
];
const evaluaciones = [
  [0, 3, '2026-10-15', 'accept', 'Trabajo bien fundamentado; conviene ampliar la discusión de resultados.', '', [18, 17, 17, 18]],
  [0, 4, '2026-10-15', 'accept', 'Precisar el periodo de los registros académicos.', 'Revisar la política de privacidad de los datos.', [15, 14, 15, 14]],
  [0, 2, '2026-10-15'],
  [1, 2, '2026-10-04', 'accept', 'Propuesta clara y aplicable al campus.', '', [17, 16, 18, 17]],
  [1, 4, '2026-10-04', 'accept', 'Buen análisis; agregar costos estimados.', '', [16, 15, 17, 16]],
  [2, 3, '2026-10-04', 'reject', 'La metodología no sustenta las conclusiones.', '', [9, 8, 10, 9]],
];

module.exports = {
  async up(query) {
    const password = passwordDemo();
    const { crearHash } = await import('../../services/password.js');
    const {
      Usuario, Edicion, Criterio, EjeTematico, TipoTrabajo, Trabajo,
      AsignacionRevision, Revision, RevisionCriterio, Decision,
    } = await import('../../models/index.js');

    await cargarDemo(query, basename(__filename), async ({ crear, crearVarios, buscarOCrear }) => {
      const [edicion] = await buscarOCrear(Edicion, { year: anioEdicionDemo }, datosEdicionDemo);
      const editionId = edicion.id;
      const personas = [];
      for (const [names, surnames, email, role, institucion] of usuarios) {
        const [persona] = await buscarOCrear(Usuario, { email }, {
          names, surnames, role, institution: institucion ?? 'Universidad de Lima',
          passwordHash: await crearHash(password), isFemale: ['Rosa María', 'Mg. Carmen', 'Dra. Ana'].includes(names),
        });
        personas.push(persona);
      }

      const rubrica = [];
      for (const [name, description, weight] of criterios) {
        const [criterio] = await buscarOCrear(Criterio, { editionId, name }, { description, weight });
        rubrica.push(criterio);
      }
      const ejes = [];
      for (const name of ['Inteligencia artificial y datos', 'Sostenibilidad y ciudad']) {
        const [eje] = await buscarOCrear(EjeTematico, { editionId, name }, {
          description: name, coordinator: personas[5].fullName,
        });
        ejes.push(eje);
      }
      const tiposPorNombre = await crearTiposTrabajoDemo(TipoTrabajo, editionId, buscarOCrear);
      const tipos = ['Artículo completo', 'Resumen extendido', 'Caso de estudio'].map(nombre => tiposPorNombre.get(nombre));

      const trabajosCreados = [];
      for (const [i, [code, title, autor, eje, status]] of trabajos.entries()) {
        const [trabajo, creado] = await buscarOCrear(Trabajo, { code }, {
          title, status, editionId, ownerId: personas[autor].id, thematicAxisId: ejes[eje].id,
          workTypeId: tipos[i].id,
        });
        if (creado) trabajosCreados[i] = trabajo;
      }
      for (const [obra, revisor, dueDate, recommendation, authorComment, committeeComment, notas] of evaluaciones) {
        const trabajo = trabajosCreados[obra];
        if (!trabajo) continue;
        const asignacion = await crear(AsignacionRevision, {
          workId: trabajo.id, reviewerId: personas[revisor].id, dueDate,
        });
        const revision = await crear(Revision, {
          assignmentId: asignacion.id,
          status: notas ? 'submitted' : 'draft',
          recommendation, authorComment, committeeComment,
          submittedAt: notas ? new Date(dueDate + 'T12:00:00-05:00') : null,
        });
        if (notas) {
          await crearVarios(RevisionCriterio, rubrica.map((criterio, i) => ({
            reviewId: revision.id, criterionId: criterio.id, criterionName: criterio.name,
            criterionWeight: criterio.weight, score: notas[i],
            comment: `Comentario sobre ${criterio.name.toLowerCase()}.`,
          })));
        }
      }
      for (const [obra, result, feedback] of [
        [1, 'accept', 'El trabajo cumple los criterios del congreso.'],
        [2, 'reject', 'La metodología no sustenta las conclusiones.'],
      ]) {
        const trabajo = trabajosCreados[obra];
        if (trabajo) await crear(Decision, {
          workId: trabajo.id, result, feedback, status: 'published', publishedAt: edicion.publicationDate,
        });
      }
    });
  },

  async down(query) {
    await revertirDemo(query, basename(__filename));
  },
};
