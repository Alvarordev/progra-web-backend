const { anioEdicionDemo, datosEdicionDemo, tiposTrabajoDemo } = require('../demo/edicion.cjs');

module.exports = {
  async up(query) {
    await query.sequelize.transaction(async transaction => {
      for (const [name, maxLength, expectedFormat, allowsCoauthors, maxCoauthors] of tiposTrabajoDemo) {
        await query.sequelize.query(
          `UPDATE tipos_trabajo t
              SET max_length = :maxLength, expected_format = :expectedFormat,
                  allows_coauthors = :allowsCoauthors, max_coauthors = :maxCoauthors, updated_at = NOW()
             FROM ediciones e
            WHERE t.edition_id = e.id AND e.year = :anio AND e.name = :edicion
              AND t.name = :name AND t.allows_coauthors = false AND t.max_coauthors IS NULL
              AND t.expected_format = 'PDF'`,
          {
            replacements: {
              anio: anioEdicionDemo, edicion: datosEdicionDemo.name,
              name, maxLength, expectedFormat, allowsCoauthors, maxCoauthors,
            },
            transaction,
          },
        );
      }
    });
  },

  async down() {},
};
