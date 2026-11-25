'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Buscamos los id de las revisiones (por trabajo y revisor) y de los criterios
    const [revisiones] = await queryInterface.sequelize.query(
      'SELECT r.id, t.codigo, u.correo FROM revisions r JOIN trabajos t ON t.id = r."trabajoId" JOIN usuarios u ON u.id = r."revisorId"'
    );
    const [criterios] = await queryInterface.sequelize.query('SELECT id, nombre FROM criterios ORDER BY id');
    const revision = (codigo, correo) => revisiones.find(r => r.codigo === codigo && r.correo === correo).id;

    // Puntajes en el orden de los criterios: Originalidad, Rigor, Claridad, Relevancia
    const notas = [
      ['TRB-2026-042', 'onakamura@pucp.edu.pe', [18, 17, 17, 18]],
      ['TRB-2026-042', 'carmen.effio@ulima.edu.pe', [15, 14, 15, 14]],
      ['TRB-2026-051', 'luis.ramirez@ulima.edu.pe', [17, 16, 18, 17]],
      ['TRB-2026-051', 'carmen.effio@ulima.edu.pe', [16, 15, 17, 16]],
      ['TRB-2026-057', 'onakamura@pucp.edu.pe', [9, 8, 10, 9]]
    ];

    // Una revisión tiene varias notas: una fila por cada criterio
    const filas = notas.flatMap(([codigo, correo, puntajes]) =>
      criterios.map((criterio, i) => ({
        revisionId: revision(codigo, correo),
        criterioId: criterio.id,
        puntaje: puntajes[i],
        comentario: `Comentario sobre ${criterio.nombre.toLowerCase()}.`,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    );
    await queryInterface.bulkInsert('revisionCriterios', filas, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('revisionCriterios', null, {});
  }
};
