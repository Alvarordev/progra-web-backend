const codigosTrabajosHu4 = [
  'TRB-2026-031',
  'TRB-2026-035',
  'TRB-2026-040',
  'TRB-2026-045',
  'TRB-2026-053',
  'TRB-2026-060',
  'TRB-2026-058',
  'TRB-2026-070',
];

const usuariosDemo = [
  ['Dra. Ana', 'Salazar Bermúdez', 'ana.salazar@ulima.edu.pe', 'committee', 'Universidad de Lima', true],
  ['Rosa María', 'Quispe Ttito', 'rosa.quispe@aloe.ulima.edu.pe', 'author', 'Universidad de Lima', true],
  ['Diego Alonso', 'Chávez Manrique', 'diego.chavez@aloe.ulima.edu.pe', 'author', 'Universidad de Lima', false],
  ['Carlos', 'Alarcón', 'carlos.alarcon@aloe.ulima.edu.pe', 'author', 'Universidad de Lima', false],
  ['Daniel', 'Paredes', 'daniel.paredes@uni.edu.pe', 'author', 'Universidad Nacional de Ingeniería', false],
  ['Lucía', 'Vargas', 'lucia.vargas@aloe.ulima.edu.pe', 'author', 'Universidad de Lima', true],
  ['Fernando', 'Soto', 'fernando.soto@up.edu.pe', 'author', 'Universidad del Pacífico', false],
  ['Camila', 'Ramos', 'camila.ramos@aloe.ulima.edu.pe', 'author', 'Universidad de Lima', true],
  ['Mg. Luis', 'Ramírez Cárdenas', 'luis.ramirez@ulima.edu.pe', 'reviewer', 'Universidad de Lima', false],
  ['Mg. Carmen', 'Effio Vargas', 'carmen.effio@ulima.edu.pe', 'reviewer', 'Universidad de Lima', true],
  ['Ing. Jorge', 'Palomino Ávila', 'jorge.palomino@ulima.edu.pe', 'reviewer', 'Universidad de Lima', false],
  ['Dra. Milagros', 'Yupanqui Ríos', 'milagros.yupanqui@ulima.edu.pe', 'reviewer', 'Universidad de Lima', true],
  ['Dr. Óscar', 'Nakamura Trigoso', 'onakamura@pucp.edu.pe', 'reviewer', 'Pontificia Universidad Católica', false],
  ['Mg. Renzo', 'Bustamante Loayza', 'renzo.bustamante@up.edu.pe', 'reviewer', 'Universidad del Pacífico', false],
  ['Mg. Patricia', 'Zegarra Coronado', 'patricia.zegarra@ulima.edu.pe', 'reviewer', 'Universidad de Lima', true],
  ['Dr. Álvaro', 'Ccahuana Pinto', 'alvaro.ccahuana@uni.edu.pe', 'reviewer', 'Universidad Nacional de Ingeniería', false],
  ['Dra. Elena', 'Valdivia Castro', 'elena.valdivia@unmsm.edu.pe', 'reviewer', 'Universidad Nacional Mayor de San Marcos', true],
];

const ejesCatalogo = [
  ['Inteligencia artificial y datos', 'Aprendizaje automático, analítica y ciencia de datos aplicada.'],
  ['Ingeniería de software', 'Arquitectura, calidad, pruebas y procesos de desarrollo.'],
  ['Sostenibilidad y ciudad', 'Movilidad, gestión del agua y ciudades resilientes.'],
  ['Innovación y emprendimiento', 'Modelos de negocio, transferencia tecnológica y startups.'],
  ['Salud y sociedad', 'Salud pública, bienestar estudiantil y política social.'],
  ['Economía y mercados', 'Mercados financieros, comercio y desarrollo económico.'],
];

const tiposCatalogo = [
  ['Artículo completo', '8 000 palabras', 'PDF · plantilla IEEE', true, 4],
  ['Resumen extendido', '2 500 palabras', 'PDF', true, 3],
  ['Póster', '1 lámina A1', 'PDF · orientación vertical', true, 5],
  ['Caso de estudio', '5 000 palabras', 'PDF', false, null],
];

const interesesPorCorreo = {
  'luis.ramirez@ulima.edu.pe': ['Ingeniería de software', 'Inteligencia artificial y datos'],
  'carmen.effio@ulima.edu.pe': ['Sostenibilidad y ciudad', 'Ingeniería de software'],
  'jorge.palomino@ulima.edu.pe': ['Innovación y emprendimiento', 'Ingeniería de software'],
  'milagros.yupanqui@ulima.edu.pe': ['Salud y sociedad'],
  'onakamura@pucp.edu.pe': ['Inteligencia artificial y datos', 'Economía y mercados'],
  'renzo.bustamante@up.edu.pe': ['Economía y mercados'],
  'patricia.zegarra@ulima.edu.pe': ['Innovación y emprendimiento'],
  'alvaro.ccahuana@uni.edu.pe': ['Sostenibilidad y ciudad'],
  'elena.valdivia@unmsm.edu.pe': ['Salud y sociedad'],
};

module.exports = {
  async up() {
    const password = process.env.HU4_DEMO_PASSWORD ?? process.env.HU5_DEMO_PASSWORD;
    if (!password || password.length < 12) {
      throw new Error(
        'Define HU5_DEMO_PASSWORD (o HU4_DEMO_PASSWORD) en .env con al menos 12 caracteres para crear las cuentas de ejemplo.'
      );
    }

    const { crearHash } = await import('../../services/password.js');
    const {
      sequelize,
      Usuario,
      Edicion,
      EjeTematico,
      TipoTrabajo,
      Trabajo,
      AutorTrabajo,
      AsignacionRevision,
      HistorialAsignacion,
      Revision,
    } = await import('../../models/index.js');

    try {
      const passwordHash = await crearHash(password);

      await sequelize.transaction(async transaction => {
        let edicion = await Edicion.findOne({ where: { year: 2026 }, transaction });
        if (!edicion) {
          edicion = await Edicion.create(
            {
              name: 'VIII Congreso Académico Estudiantil',
              year: 2026,
              venue: 'Universidad de Lima',
              status: 'under_review',
              receptionDeadline: '2026-09-30T23:59:00-05:00',
              reviewDeadline: '2026-12-20T18:00:00-05:00',
              publicationDate: '2026-12-28T12:00:00-05:00',
            },
            { transaction, validate: true }
          );
        }

        const editionId = edicion.id;
        const usuariosPorCorreo = new Map();

        for (const [names, surnames, email, role, institution, isFemale] of usuariosDemo) {
          const [usuario] = await Usuario.findOrCreate({
            where: { email },
            defaults: {
              names,
              surnames,
              email,
              role,
              institution,
              isFemale,
              passwordHash,
            },
            transaction,
          });
          if (usuario.isFemale !== isFemale) {
            await usuario.update({ isFemale }, { transaction });
          }
          usuariosPorCorreo.set(email, usuario);
        }

        const coordinadora = usuariosPorCorreo.get('ana.salazar@ulima.edu.pe');
        const ejesPorNombre = new Map();

        for (const [name, description] of ejesCatalogo) {
          const [eje] = await EjeTematico.findOrCreate({
            where: { editionId, name },
            defaults: {
              editionId,
              name,
              description,
              coordinator: coordinadora.fullName,
            },
            transaction,
          });
          ejesPorNombre.set(name, eje);
        }

        const tiposPorNombre = new Map();
        for (const [name, maxLength, expectedFormat, allowsCoauthors, maxCoauthors] of tiposCatalogo) {
          const [tipo] = await TipoTrabajo.findOrCreate({
            where: { editionId, name },
            defaults: {
              editionId,
              name,
              maxLength,
              expectedFormat,
              allowsCoauthors,
              maxCoauthors,
            },
            transaction,
          });
          tiposPorNombre.set(name, tipo);
        }

        for (const [correo, nombresEjes] of Object.entries(interesesPorCorreo)) {
          const revisor = usuariosPorCorreo.get(correo);
          const ejes = nombresEjes.map(nombre => ejesPorNombre.get(nombre)).filter(Boolean);
          if (revisor && ejes.length) {
            await revisor.addInterests(ejes, { transaction });
          }
        }

        // Agrega coautores al trabajo TRB-2026-042 si ya existe para demostrar conflicto por coautoría
        const trabajo042 = await Trabajo.findOne({ where: { code: 'TRB-2026-042' }, transaction });
        if (trabajo042) {
          const conteoFirmantes042 = await AutorTrabajo.count({
            where: { workId: trabajo042.id },
            transaction,
          });
          if (conteoFirmantes042 === 0) {
            const rosa = usuariosPorCorreo.get('rosa.quispe@aloe.ulima.edu.pe');
            const diego = usuariosPorCorreo.get('diego.chavez@aloe.ulima.edu.pe');
            const milagros = usuariosPorCorreo.get('milagros.yupanqui@ulima.edu.pe');
            await AutorTrabajo.bulkCreate(
              [
                {
                  workId: trabajo042.id,
                  userId: rosa.id,
                  name: rosa.fullName,
                  email: rosa.email,
                  institution: rosa.institution,
                  isCorresponding: true,
                  position: 1,
                },
                {
                  workId: trabajo042.id,
                  userId: diego.id,
                  name: diego.fullName,
                  email: diego.email,
                  institution: diego.institution,
                  isCorresponding: false,
                  position: 2,
                },
                {
                  workId: trabajo042.id,
                  userId: milagros.id,
                  name: 'Milagros Yupanqui Ríos',
                  email: milagros.email,
                  institution: milagros.institution,
                  isCorresponding: false,
                  position: 3,
                },
              ],
              { transaction, validate: true }
            );
          }
        }

        const definicionesTrabajos = [
          {
            code: 'TRB-2026-031',
            title: 'Refactorización guiada por métricas de deuda técnica',
            eje: 'Ingeniería de software',
            tipo: 'Artículo completo',
            status: 'submitted',
            ownerEmail: 'carlos.alarcon@aloe.ulima.edu.pe',
            coautores: [
              {
                name: 'Beatriz Mendoza',
                email: 'beatriz.mendoza@aloe.ulima.edu.pe',
                institution: 'Universidad de Lima',
              },
            ],
            asignaciones: [],
          },
          {
            code: 'TRB-2026-035',
            title: 'Pruebas automatizadas en proyectos universitarios de software',
            eje: 'Ingeniería de software',
            tipo: 'Resumen extendido',
            status: 'submitted',
            ownerEmail: 'daniel.paredes@uni.edu.pe',
            coautores: [],
            asignaciones: [],
          },
          {
            code: 'TRB-2026-040',
            title: 'Arquitectura de microservicios para un sistema de matrícula',
            eje: 'Ingeniería de software',
            tipo: 'Caso de estudio',
            status: 'submitted',
            ownerEmail: 'lucia.vargas@aloe.ulima.edu.pe',
            coautores: [],
            asignaciones: [],
          },
          {
            code: 'TRB-2026-045',
            title: 'Detección de fraude en pagos móviles con modelos de árboles',
            eje: 'Economía y mercados',
            tipo: 'Artículo completo',
            status: 'under_review',
            ownerEmail: 'fernando.soto@up.edu.pe',
            coautores: [],
            asignaciones: [
              {
                reviewerEmail: 'jorge.palomino@ulima.edu.pe',
                dueDate: '2026-10-08',
                submitted: false,
              },
              {
                reviewerEmail: 'renzo.bustamante@up.edu.pe',
                dueDate: '2026-10-12',
                submitted: true,
                recommendation: 'accept',
                authorComment: 'Análisis riguroso de modelos basados en árboles.',
                conflictJustification: 'Único especialista disponible en modelos financieros.',
              },
            ],
          },
          {
            code: 'TRB-2026-053',
            title: 'Bienestar emocional y rendimiento académico en primeros ciclos',
            eje: 'Salud y sociedad',
            tipo: 'Póster',
            status: 'under_review',
            ownerEmail: 'camila.ramos@aloe.ulima.edu.pe',
            coautores: [],
            asignaciones: [
              {
                reviewerEmail: 'patricia.zegarra@ulima.edu.pe',
                dueDate: '2026-10-09',
                submitted: false,
                conflictJustification: 'Revisora externa a la facultad de la autora.',
              },
              {
                reviewerEmail: 'elena.valdivia@unmsm.edu.pe',
                dueDate: '2026-12-15',
                submitted: false,
              },
            ],
          },
          {
            code: 'TRB-2026-060',
            title: 'Segmentación de estudiantes por hábitos de estudio',
            eje: 'Inteligencia artificial y datos',
            tipo: 'Artículo completo',
            status: 'under_review',
            ownerEmail: 'diego.chavez@aloe.ulima.edu.pe',
            coautores: [],
            asignaciones: [
              {
                reviewerEmail: 'alvaro.ccahuana@uni.edu.pe',
                dueDate: '2026-12-20',
                submitted: false,
              },
              {
                reviewerEmail: 'onakamura@pucp.edu.pe',
                dueDate: '2026-10-14',
                submitted: true,
                recommendation: 'accept',
                authorComment: 'Metodología de clustering clara y reproducible.',
              },
            ],
          },
          {
            code: 'TRB-2026-058',
            title: 'Clasificación automática de reclamos vecinales con procesamiento de texto',
            eje: 'Inteligencia artificial y datos',
            tipo: 'Póster',
            status: 'draft',
            ownerEmail: 'rosa.quispe@aloe.ulima.edu.pe',
            coautores: [],
            asignaciones: [],
          },
          {
            code: 'TRB-2026-070',
            title: 'Modelo de rotación docente en institutos de Lima Norte',
            eje: 'Salud y sociedad',
            tipo: 'Resumen extendido',
            status: 'draft',
            ownerEmail: 'rosa.quispe@aloe.ulima.edu.pe',
            coautores: [],
            asignaciones: [],
          },
        ];

        for (const item of definicionesTrabajos) {
          const owner = usuariosPorCorreo.get(item.ownerEmail);
          const eje = ejesPorNombre.get(item.eje);
          const tipo = tiposPorNombre.get(item.tipo);

          const [trabajo, creado] = await Trabajo.findOrCreate({
            where: { code: item.code },
            defaults: {
              code: item.code,
              title: item.title,
              status: item.status,
              editionId,
              ownerId: owner.id,
              thematicAxisId: eje.id,
              workTypeId: tipo.id,
              submittedAt: item.status === 'draft' ? null : new Date('2026-09-25T18:00:00-05:00'),
            },
            transaction,
          });

          if (!creado) continue;

          const firmantes = [
            {
              workId: trabajo.id,
              userId: owner.id,
              name: owner.fullName,
              email: owner.email,
              institution: owner.institution,
              isCorresponding: true,
              position: 1,
            },
            ...item.coautores.map((coautor, idx) => ({
              workId: trabajo.id,
              userId: null,
              name: coautor.name,
              email: coautor.email,
              institution: coautor.institution,
              isCorresponding: false,
              position: idx + 2,
            })),
          ];
          await AutorTrabajo.bulkCreate(firmantes, { transaction, validate: true });

          for (const asig of item.asignaciones) {
            const revisor = usuariosPorCorreo.get(asig.reviewerEmail);
            const asignacion = await AsignacionRevision.create(
              {
                workId: trabajo.id,
                reviewerId: revisor.id,
                dueDate: asig.dueDate,
                conflictJustification: asig.conflictJustification ?? null,
              },
              { transaction, validate: true }
            );

            await Revision.create(
              {
                assignmentId: asignacion.id,
                status: asig.submitted ? 'submitted' : 'draft',
                recommendation: asig.submitted ? asig.recommendation : null,
                authorComment: asig.submitted ? asig.authorComment : '',
                committeeComment: '',
                submittedAt: asig.submitted ? new Date(`${asig.dueDate}T12:00:00-05:00`) : null,
              },
              { transaction, validate: true }
            );

            await HistorialAsignacion.create(
              {
                workId: trabajo.id,
                action: 'assigned',
                reviewerId: revisor.id,
                performedById: coordinadora.id,
                reason: null,
                conflictJustification: asig.conflictJustification ?? null,
                dueDate: asig.dueDate,
              },
              { transaction, validate: true }
            );
          }
        }
      });
    } finally {
      await sequelize.close();
    }
  },

  async down(query) {
    await query.sequelize.transaction(async transaction => {
      await query.bulkDelete(
        'trabajos',
        { code: codigosTrabajosHu4 },
        { transaction }
      );

      await query.sequelize.query(
        `DELETE FROM autores_trabajo
         WHERE work_id IN (SELECT id FROM trabajos WHERE code = 'TRB-2026-042')`,
        { transaction }
      );

      await query.bulkDelete('intereses_revisor', null, { transaction });

      await query.sequelize.query(
        `DELETE FROM usuarios u WHERE u.email IN (:correos)
          AND NOT EXISTS (SELECT 1 FROM trabajos WHERE owner_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM asignaciones_revision WHERE reviewer_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM autores_trabajo WHERE user_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM sesiones_programa WHERE moderator_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM recordatorios_revision WHERE sent_by_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM intereses_revisor WHERE user_id = u.id)`,
        {
          replacements: { correos: usuariosDemo.map(([, , correo]) => correo) },
          transaction,
        }
      );
    });
  },
};
