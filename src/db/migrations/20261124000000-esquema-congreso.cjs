// Esquema inicial. Los cambios futuros se aplican mediante nuevas migraciones.
function tablas(Sequelize) {
  const idEntero = { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false };
  const marcaTiempo = { type: Sequelize.DATE, allowNull: false };
  const referencia = (tabla, onDelete, opciones = {}) => ({
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: tabla, key: 'id' },
    onDelete,
    onUpdate: 'CASCADE',
    ...opciones,
  });

  return [
    ['ediciones', {
      id: idEntero,
      name: { type: Sequelize.STRING(200), allowNull: false },
      year: { type: Sequelize.SMALLINT, allowNull: false, unique: true },
      venue: { type: Sequelize.STRING(250), allowNull: false },
      description: { type: Sequelize.STRING(400), allowNull: false, defaultValue: '' },
      status: { type: Sequelize.ENUM('preparation', 'reception_open', 'under_review'), allowNull: false, defaultValue: 'preparation' },
      reception_deadline: { type: Sequelize.DATE, allowNull: false },
      review_deadline: { type: Sequelize.DATE, allowNull: false },
      publication_date: { type: Sequelize.DATE, allowNull: false },
      program_published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      program_snapshot: { type: Sequelize.JSONB },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
    }],
    ['criterios', {
      id: idEntero,
      name: { type: Sequelize.STRING(120), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      weight: { type: Sequelize.SMALLINT, allowNull: false },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      edition_id: referencia('ediciones', 'CASCADE'),
    }, [['edition_id', 'name']]],
    ['usuarios', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      names: { type: Sequelize.STRING(120), allowNull: false },
      surnames: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(254), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING, allowNull: false },
      institution: { type: Sequelize.STRING(200), allowNull: false },
      role: { type: Sequelize.ENUM('author', 'reviewer', 'both', 'committee'), allowNull: false },
      degree: { type: Sequelize.STRING(150) },
      student_code: { type: Sequelize.STRING(20) },
      accepted_terms: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_female: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      blocked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      block_reason: { type: Sequelize.TEXT },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
    }],
    ['ejes_tematicos', {
      id: idEntero,
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      coordinator: { type: Sequelize.STRING(150), allowNull: false },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      edition_id: referencia('ediciones', 'CASCADE'),
    }, [['edition_id', 'name']]],
    ['tipos_trabajo', {
      id: idEntero,
      name: { type: Sequelize.STRING(120), allowNull: false },
      max_length: { type: Sequelize.STRING(60), allowNull: false },
      expected_format: { type: Sequelize.ENUM('PDF', 'PDF · plantilla IEEE', 'PDF · orientación vertical'), allowNull: false, defaultValue: 'PDF' },
      allows_coauthors: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      max_coauthors: { type: Sequelize.SMALLINT },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      edition_id: referencia('ediciones', 'CASCADE'),
    }, [['edition_id', 'name']]],
    ['trabajos', {
      id: idEntero,
      code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      title: { type: Sequelize.STRING(300), allowNull: false },
      abstract: { type: Sequelize.TEXT, allowNull: false, defaultValue: '' },
      keywords: { type: Sequelize.ARRAY(Sequelize.STRING(80)), allowNull: false, defaultValue: [] },
      document_url: { type: Sequelize.STRING(500) },
      status: { type: Sequelize.ENUM('draft', 'submitted', 'under_review', 'accepted', 'rejected'), allowNull: false, defaultValue: 'draft' },
      submitted_at: { type: Sequelize.DATE },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      edition_id: referencia('ediciones', 'CASCADE'),
      owner_id: referencia('usuarios', 'CASCADE', { type: Sequelize.UUID }),
      thematic_axis_id: referencia('ejes_tematicos', 'CASCADE'),
      work_type_id: referencia('tipos_trabajo', 'CASCADE'),
    }],
    ['decisiones', {
      id: idEntero,
      result: { type: Sequelize.ENUM('accept', 'reject'), allowNull: false },
      feedback: { type: Sequelize.TEXT, allowNull: false, defaultValue: '' },
      status: { type: Sequelize.ENUM('draft', 'published'), allowNull: false, defaultValue: 'draft' },
      published_at: { type: Sequelize.DATE },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      work_id: referencia('trabajos', 'CASCADE'),
    }, [['work_id']]],
    ['salas', {
      id: idEntero,
      code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      location: { type: Sequelize.STRING(200), allowNull: false },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
    }],
    ['sesiones_programa', {
      id: idEntero,
      name: { type: Sequelize.STRING(200), allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      start_time: { type: Sequelize.TIME, allowNull: false },
      end_time: { type: Sequelize.TIME, allowNull: false },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      edition_id: referencia('ediciones', 'CASCADE'),
      room_id: referencia('salas', 'CASCADE'),
      thematic_axis_id: referencia('ejes_tematicos', 'CASCADE'),
      moderator_id: referencia('usuarios', 'SET NULL', { type: Sequelize.UUID, allowNull: true }),
    }],
    ['asignaciones_revision', {
      id: idEntero,
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      work_id: referencia('trabajos', 'CASCADE'),
      reviewer_id: referencia('usuarios', 'CASCADE', { type: Sequelize.UUID }),
    }, [['work_id', 'reviewer_id']]],
    ['revisiones', {
      id: idEntero,
      status: { type: Sequelize.ENUM('draft', 'submitted'), allowNull: false, defaultValue: 'draft' },
      recommendation: { type: Sequelize.ENUM('accept', 'revisions', 'reject') },
      author_comment: { type: Sequelize.TEXT, allowNull: false, defaultValue: '' },
      committee_comment: { type: Sequelize.TEXT, allowNull: false, defaultValue: '' },
      submitted_at: { type: Sequelize.DATE },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      assignment_id: referencia('asignaciones_revision', 'CASCADE'),
    }, [['assignment_id']]],
    ['recordatorios_revision', {
      id: idEntero,
      created_at: marcaTiempo,
      assignment_id: referencia('asignaciones_revision', 'CASCADE'),
      sent_by_id: referencia('usuarios', 'SET NULL', { type: Sequelize.UUID, allowNull: true }),
    }],
    ['revision_criterios', {
      id: idEntero,
      criterion_name: { type: Sequelize.STRING(120), allowNull: false },
      criterion_weight: { type: Sequelize.SMALLINT, allowNull: false },
      score: { type: Sequelize.SMALLINT },
      comment: { type: Sequelize.TEXT, allowNull: false, defaultValue: '' },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      review_id: referencia('revisiones', 'CASCADE'),
      criterion_id: referencia('criterios', 'SET NULL', { allowNull: true }),
    }, [['review_id', 'criterion_id']]],
    ['trabajos_sesion', {
      id: idEntero,
      position: { type: Sequelize.SMALLINT, allowNull: false },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      session_id: referencia('sesiones_programa', 'CASCADE'),
      work_id: referencia('trabajos', 'CASCADE'),
    }, [['work_id'], ['session_id', 'position']]],
    ['autores_trabajo', {
      id: idEntero,
      name: { type: Sequelize.STRING(250), allowNull: false },
      email: { type: Sequelize.STRING(254) },
      institution: { type: Sequelize.STRING(200), allowNull: false },
      is_corresponding: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      position: { type: Sequelize.SMALLINT, allowNull: false },
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      work_id: referencia('trabajos', 'CASCADE'),
      user_id: referencia('usuarios', 'SET NULL', { type: Sequelize.UUID, allowNull: true }),
    }, [['work_id', 'position']]],
    ['intereses_revisor', {
      created_at: marcaTiempo,
      updated_at: marcaTiempo,
      user_id: { ...referencia('usuarios', 'CASCADE', { type: Sequelize.UUID }), primaryKey: true },
      thematic_axis_id: { ...referencia('ejes_tematicos', 'CASCADE'), primaryKey: true },
    }],
  ];
}

module.exports = {
  async up(query, Sequelize) {
    await query.sequelize.transaction(async transaction => {
      const existentes = await query.showAllTables({ transaction });
      if (existentes.some(tabla => ['revisions', 'revisionCriterios', 'decisions'].includes(tabla))) {
        throw new Error('Esta base contiene el esquema preliminar de la HU5. Conserva sus datos y configura una base nueva para el esquema compartido.');
      }
      for (const [tabla, columnas, indices = []] of tablas(Sequelize)) {
        await query.createTable(tabla, columnas, { transaction });
        for (const campos of indices) {
          await query.addIndex(tabla, campos, { unique: true, transaction });
        }
      }
    });
  },

  async down(query, Sequelize) {
    await query.sequelize.transaction(async transaction => {
      for (const [tabla, columnas] of tablas(Sequelize).reverse()) {
        await query.dropTable(tabla, { transaction });
        for (const [campo, columna] of Object.entries(columnas)) {
          if (columna.type.key === 'ENUM') {
            await query.dropEnum(`enum_${tabla}_${campo}`, { transaction });
          }
        }
      }
    });
  },
};
