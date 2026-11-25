const nombreEdicion = 'Congreso Académico Estudiantil (demo HU5)';
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
  async up() {
    const password = process.env.HU5_DEMO_PASSWORD;
    if (!password || password.length < 12) {
      throw new Error('Define HU5_DEMO_PASSWORD en .env con al menos 12 caracteres para crear las cuentas de ejemplo.');
    }
    const { crearHash } = await import('../../services/password.js');
    const {
      sequelize, Usuario, Edicion, Criterio, EjeTematico, TipoTrabajo, Trabajo,
      AsignacionRevision, Revision, RevisionCriterio, Decision,
    } = await import('../../models/index.js');

    try {
      const cuentas = await Promise.all(usuarios.map(async ([names, surnames, email, role, institucion]) => ({
        names, surnames, email, role, institution: institucion ?? 'Universidad de Lima',
        passwordHash: await crearHash(password),
      })));
      await sequelize.transaction(async transaction => {
        const opciones = { transaction, validate: true, returning: true };
        const edicion = await Edicion.create({
          name: nombreEdicion, year: 2026, venue: 'Universidad de Lima', status: 'under_review',
          receptionDeadline: '2026-09-30T23:59:00-05:00',
          reviewDeadline: '2026-10-15T23:59:00-05:00',
          publicationDate: '2026-10-20T09:00:00-05:00',
        }, opciones);
        const editionId = edicion.id;
        const personas = await Usuario.bulkCreate(cuentas, opciones);
        const rubrica = await Criterio.bulkCreate(criterios.map(([name, description, weight]) =>
          ({ name, description, weight, editionId })), opciones);
        const ejes = await EjeTematico.bulkCreate(['Inteligencia artificial y datos', 'Sostenibilidad y ciudad']
          .map(name => ({ name, editionId, description: name, coordinator: personas[5].fullName })), opciones);
        const tipos = await TipoTrabajo.bulkCreate([
          ['Artículo completo', '8 000 palabras'],
          ['Resumen extendido', '2 000 palabras'],
          ['Caso de estudio', '4 000 palabras'],
        ].map(([name, maxLength]) => ({ name, maxLength, editionId, allowsCoauthors: false })), opciones);
        const trabajosCreados = await Trabajo.bulkCreate(trabajos.map(([code, title, autor, eje, status], i) => ({
          code, title, status, editionId, ownerId: personas[autor].id, thematicAxisId: ejes[eje].id,
          workTypeId: tipos[i].id,
        })), opciones);
        for (const [obra, revisor, dueDate, recommendation, authorComment, committeeComment, notas] of evaluaciones) {
          const asignacion = await AsignacionRevision.create({
            workId: trabajosCreados[obra].id, reviewerId: personas[revisor].id, dueDate,
          }, opciones);
          const revision = await Revision.create({
            assignmentId: asignacion.id,
            status: notas ? 'submitted' : 'draft',
            recommendation, authorComment, committeeComment,
            submittedAt: notas ? new Date(dueDate + 'T12:00:00-05:00') : null,
          }, opciones);
          if (notas) {
            await RevisionCriterio.bulkCreate(rubrica.map((criterio, i) => ({
              reviewId: revision.id, criterionId: criterio.id, criterionName: criterio.name,
              criterionWeight: criterio.weight, score: notas[i],
              comment: `Comentario sobre ${criterio.name.toLowerCase()}.`,
            })), opciones);
          }
        }

        await Decision.bulkCreate([
          [1, 'accept', 'El trabajo cumple los criterios del congreso.'],
          [2, 'reject', 'La metodología no sustenta las conclusiones.'],
        ].map(([obra, result, feedback]) => ({
          workId: trabajosCreados[obra].id, result, feedback,
          status: 'published', publishedAt: edicion.publicationDate,
        })), opciones);
      });
    } finally {
      await sequelize.close();
    }
  },

  async down(query) {
    await query.sequelize.transaction(async transaction => {
      const [edicion] = await query.sequelize.query(
        'SELECT id FROM ediciones WHERE year = 2026 AND name = :nombre',
        { replacements: { nombre: nombreEdicion }, transaction },
      );
      if (!edicion.length) return;
      await query.bulkDelete('ediciones', { id: edicion[0].id }, { transaction });
      await query.sequelize.query(
        `DELETE FROM usuarios u WHERE u.email IN (:correos)
          AND NOT EXISTS (SELECT 1 FROM trabajos WHERE owner_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM asignaciones_revision WHERE reviewer_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM autores_trabajo WHERE user_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM sesiones_programa WHERE moderator_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM recordatorios_revision WHERE sent_by_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM intereses_revisor WHERE user_id = u.id)`,
        { replacements: { correos: usuarios.map(([, , correo]) => correo) }, transaction },
      );
    });
  },
};
