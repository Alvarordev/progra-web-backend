// Datos de ejemplo HU-3 .-.
// Crea una edición con la recepcin abierta, sus ejes temáticos, sus tipos de trabajo
// crea 2 centas de autor que se ejecutan con --> npm run db:seed:hu3
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
  async up(queryInterface) {
    const password = process.env.HU3_DEMO_PASSWORD;
    if (!password || password.length < 12) {
      throw new Error('Agrega HU3_DEMO_PASSWORD en .env con una contraseña de al menos 12 caracteres.');
    }
    const { crearHash } = await import('../../services/password.js');
    const ahora = new Date();

    // 1. Cuentas de autor. Si ya existen (por la demo de la HU5), no se duplican.
    for (const [nombres, apellidos, correo] of autores) {
      await queryInterface.sequelize.query(
        `INSERT INTO usuarios (names, surnames, email, password_hash, institution, role, accepted_terms, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'Universidad de Lima', 'author', true, ?, ?)
         ON CONFLICT (email) DO NOTHING`,
        { replacements: [nombres, apellidos, correo, await crearHash(password), ahora, ahora] },
      );
    }

    // 2. Edición 2027 con la recepción abierta hasta el 30/09/2027.
    const [[edicion]] = await queryInterface.sequelize.query(
      `INSERT INTO ediciones (name, year, venue, status, reception_deadline, review_deadline, publication_date, created_at, updated_at)
       VALUES ('Congreso Académico Estudiantil (demo HU3)', 2027, 'Universidad de Lima', 'reception_open',
               '2027-09-30T23:59:00-05:00', '2027-10-15T23:59:00-05:00', '2027-10-28T09:00:00-05:00', ?, ?)
       RETURNING id`,
      { replacements: [ahora, ahora] },
    );

    // 3. Ejes temáticos y tipos de trabajo de esa edición.
    await queryInterface.bulkInsert('ejes_tematicos', ejes.map(nombre => ({
      name: nombre,
      description: nombre,
      coordinator: 'Dra. Ana Salazar Bermúdez',
      edition_id: edicion.id,
      created_at: ahora,
      updated_at: ahora,
    })));
    await queryInterface.bulkInsert('tipos_trabajo', tipos.map(([nombre, extension, formato, maxCoautores]) => ({
      name: nombre,
      max_length: extension,
      expected_format: formato,
      allows_coauthors: true,
      max_coauthors: maxCoautores,
      edition_id: edicion.id,
      created_at: ahora,
      updated_at: ahora,
    })));
  },

  // Deshace la demo: al borrar la edición se borran sus ejes, tipos y trabajos.
  async down(queryInterface) {
    await queryInterface.bulkDelete('ediciones', { year: 2027, name: 'Congreso Académico Estudiantil (demo HU3)' });
  },
};
