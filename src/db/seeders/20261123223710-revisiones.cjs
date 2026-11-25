'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Buscamos los id de los trabajos y de los revisores para relacionarlos
    const [trabajos] = await queryInterface.sequelize.query('SELECT id, codigo FROM trabajos');
    const [usuarios] = await queryInterface.sequelize.query('SELECT id, correo FROM usuarios');
    const trabajo = codigo => trabajos.find(t => t.codigo === codigo).id;
    const revisor = correo => usuarios.find(u => u.correo === correo).id;

    // Parte revisor: un trabajo tiene una o varias revisiones.
    // Las notas por criterio están en el seeder de revisionCriterios.
    await queryInterface.bulkInsert('revisions', [
      { trabajoId: trabajo('TRB-2026-042'), revisorId: revisor('onakamura@pucp.edu.pe'), recomendacion: 'aceptar', comentarioAutor: 'Trabajo bien fundamentado; conviene ampliar la discusión de resultados.', comentarioComite: '', fechaLimite: '2026-10-15', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-042'), revisorId: revisor('carmen.effio@ulima.edu.pe'), recomendacion: 'aceptar', comentarioAutor: 'Precisar el periodo de los registros académicos.', comentarioComite: 'Revisar la política de privacidad de los datos.', fechaLimite: '2026-10-15', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-042'), revisorId: revisor('luis.ramirez@ulima.edu.pe'), recomendacion: '', comentarioAutor: '', comentarioComite: '', fechaLimite: '2026-10-15', estado: 'borrador', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-051'), revisorId: revisor('luis.ramirez@ulima.edu.pe'), recomendacion: 'aceptar', comentarioAutor: 'Propuesta clara y aplicable al campus.', comentarioComite: '', fechaLimite: '2026-10-04', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-051'), revisorId: revisor('carmen.effio@ulima.edu.pe'), recomendacion: 'aceptar', comentarioAutor: 'Buen análisis; agregar costos estimados.', comentarioComite: '', fechaLimite: '2026-10-04', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-057'), revisorId: revisor('onakamura@pucp.edu.pe'), recomendacion: 'rechazar', comentarioAutor: 'La metodología no sustenta las conclusiones.', comentarioComite: '', fechaLimite: '2026-10-04', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('revisions', null, {});
  }
};
