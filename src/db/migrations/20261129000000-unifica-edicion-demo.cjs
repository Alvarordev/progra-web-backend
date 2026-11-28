const { anioEdicionDemo, datosEdicionDemo } = require('../demo/edicion.cjs');

const nombresDemo = [
  'Congreso Académico Estudiantil (demo HU5)',
  'VIII Congreso Académico Estudiantil',
];

module.exports = {
  async up(query) {
    await query.sequelize.transaction(async transaction => {
      const consultar = (sql, replacements) =>
        query.sequelize.query(sql, { replacements, transaction, type: 'SELECT' });

      const [base] = await consultar('SELECT id, name FROM ediciones WHERE year = :anio', {
        anio: anioEdicionDemo,
      });
      if (!base) return;

      const [duplicada] = await consultar(
        `SELECT e.id FROM ediciones e
          WHERE e.year = 2027 AND e.name = 'Congreso Académico Estudiantil (demo HU3)'
            AND NOT EXISTS (SELECT 1 FROM trabajos t WHERE t.edition_id = e.id)
            AND NOT EXISTS (SELECT 1 FROM sesiones_programa s WHERE s.edition_id = e.id)`,
      );
      if (duplicada) {
        await consultar(
          `INSERT INTO intereses_revisor (user_id, thematic_axis_id, created_at, updated_at)
           SELECT i.user_id, b.id, NOW(), NOW()
             FROM intereses_revisor i
             JOIN ejes_tematicos d ON d.id = i.thematic_axis_id AND d.edition_id = :duplicada
             JOIN ejes_tematicos b ON b.edition_id = :base AND b.name = d.name
           ON CONFLICT DO NOTHING`,
          { duplicada: duplicada.id, base: base.id },
        );
        await consultar('DELETE FROM ediciones WHERE id = :id', { id: duplicada.id });
        await consultar("DELETE FROM registros_demo WHERE seeder = '20261125000000-demo-hu3.cjs'");
      }

      if (nombresDemo.includes(base.name)) {
        await consultar(
          `UPDATE ediciones
              SET name = :name, status = :status, reception_deadline = :receptionDeadline,
                  review_deadline = :reviewDeadline, publication_date = :publicationDate,
                  updated_at = NOW()
            WHERE id = :id`,
          { ...datosEdicionDemo, id: base.id },
        );
      }
    });
  },

  async down() {},
};
