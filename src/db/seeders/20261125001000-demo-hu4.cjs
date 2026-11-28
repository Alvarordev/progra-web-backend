const { basename } = require('node:path');
const { cargarDemo, passwordDemo, revertirDemo } = require('../demo/registrar.cjs');
const { anioEdicionDemo, datosEdicionDemo } = require('../demo/edicion.cjs');

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
  async up(query) {
    const password = passwordDemo();
    const { crearHash } = await import('../../services/password.js');
    const {
      Usuario, Edicion, EjeTematico, TipoTrabajo, Trabajo, AutorTrabajo,
      AsignacionRevision, HistorialAsignacion, Revision,
    } = await import('../../models/index.js');
    const passwordHash = await crearHash(password);

    await cargarDemo(query, basename(__filename), async ({ transaction, crear, crearVarios, buscarOCrear }) => {
      const [edicion] = await buscarOCrear(Edicion, { year: anioEdicionDemo }, datosEdicionDemo);
      const editionId = edicion.id;
      const usuariosPorCorreo = new Map();

      for (const [names, surnames, email, role, institution, isFemale] of usuariosDemo) {
        const [usuario] = await buscarOCrear(Usuario, { email }, {
          names, surnames, role, institution, isFemale, passwordHash,
        });
        usuariosPorCorreo.set(email, usuario);
      }

      const coordinadora = usuariosPorCorreo.get('ana.salazar@ulima.edu.pe');
      const ejesPorNombre = new Map();

      for (const [name, description] of ejesCatalogo) {
        const [eje] = await buscarOCrear(EjeTematico, { editionId, name }, {
          description, coordinator: coordinadora.fullName,
        });
        ejesPorNombre.set(name, eje);
      }

      const tiposPorNombre = new Map();
      for (const [name, maxLength, expectedFormat, allowsCoauthors, maxCoauthors] of tiposCatalogo) {
        const [tipo] = await buscarOCrear(TipoTrabajo, { editionId, name }, {
          maxLength, expectedFormat, allowsCoauthors, maxCoauthors,
        });
        tiposPorNombre.set(name, tipo);
      }

      const InteresRevisor = Usuario.associations.interests.through.model;
      for (const [correo, nombresEjes] of Object.entries(interesesPorCorreo)) {
        const revisor = usuariosPorCorreo.get(correo);
        for (const nombreEje of nombresEjes) {
          await buscarOCrear(InteresRevisor, {
            userId: revisor.id,
            thematicAxisId: ejesPorNombre.get(nombreEje).id,
          });
        }
      }

      // Agrega coautores al trabajo TRB-2026-042 si ya existe para demostrar conflicto por coautoría
      const trabajo042 = await Trabajo.findOne({ where: { code: 'TRB-2026-042', editionId }, transaction });
      if (trabajo042) {
        const conteoFirmantes042 = await AutorTrabajo.count({
          where: { workId: trabajo042.id },
          transaction,
        });
        if (conteoFirmantes042 === 0) {
          const rosa = usuariosPorCorreo.get('rosa.quispe@aloe.ulima.edu.pe');
          const diego = usuariosPorCorreo.get('diego.chavez@aloe.ulima.edu.pe');
          const milagros = usuariosPorCorreo.get('milagros.yupanqui@ulima.edu.pe');
          await crearVarios(AutorTrabajo,
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
            ]
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

        const [trabajo, creado] = await buscarOCrear(Trabajo, { code: item.code }, {
          title: item.title,
          status: item.status,
          editionId,
          ownerId: owner.id,
          thematicAxisId: eje.id,
          workTypeId: tipo.id,
          submittedAt: item.status === 'draft' ? null : new Date('2026-09-25T18:00:00-05:00'),
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
        await crearVarios(AutorTrabajo, firmantes);

        for (const asig of item.asignaciones) {
          const revisor = usuariosPorCorreo.get(asig.reviewerEmail);
          const asignacion = await crear(AsignacionRevision, {
            workId: trabajo.id,
            reviewerId: revisor.id,
            dueDate: asig.dueDate,
            conflictJustification: asig.conflictJustification ?? null,
          });

          await crear(Revision, {
            assignmentId: asignacion.id,
            status: asig.submitted ? 'submitted' : 'draft',
            recommendation: asig.submitted ? asig.recommendation : null,
            authorComment: asig.submitted ? asig.authorComment : '',
            committeeComment: '',
            submittedAt: asig.submitted ? new Date(`${asig.dueDate}T12:00:00-05:00`) : null,
          });

          await crear(HistorialAsignacion, {
            workId: trabajo.id,
            action: 'assigned',
            reviewerId: revisor.id,
            performedById: coordinadora.id,
            reason: null,
            conflictJustification: asig.conflictJustification ?? null,
            dueDate: asig.dueDate,
          });
        }
      }
    });
  },

  async down(query) {
    await revertirDemo(query, basename(__filename));
  },
};
