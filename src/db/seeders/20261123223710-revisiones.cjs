'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Buscamos los id de los trabajos y de los revisores para relacionarlos
    const [trabajos] = await queryInterface.sequelize.query('SELECT id, codigo FROM trabajos');
    const [usuarios] = await queryInterface.sequelize.query('SELECT id, correo FROM usuarios');
    const trabajo = codigo => trabajos.find(t => t.codigo === codigo).id;
    const revisor = correo => usuarios.find(u => u.correo === correo).id;

    // Parte revisor: un trabajo tiene una o varias revisiones
    await queryInterface.bulkInsert('revisions', [
      { trabajoId: trabajo('TRB-2026-042'), revisorId: revisor('onakamura@pucp.edu.pe'), puntaje: 18, recomendacion: 'aceptar', comentario: 'Trabajo bien fundamentado; conviene ampliar la discusión de resultados.', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-042'), revisorId: revisor('carmen.effio@ulima.edu.pe'), puntaje: 14, recomendacion: 'aceptar', comentario: 'Precisar el periodo de los registros académicos.', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-042'), revisorId: revisor('luis.ramirez@ulima.edu.pe'), puntaje: null, recomendacion: '', comentario: '', estado: 'pendiente', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-051'), revisorId: revisor('luis.ramirez@ulima.edu.pe'), puntaje: 17, recomendacion: 'aceptar', comentario: 'Propuesta clara y aplicable al campus.', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-051'), revisorId: revisor('carmen.effio@ulima.edu.pe'), puntaje: 16, recomendacion: 'aceptar', comentario: 'Buen análisis; agregar costos estimados.', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-057'), revisorId: revisor('onakamura@pucp.edu.pe'), puntaje: 9, recomendacion: 'rechazar', comentario: 'La metodología no sustenta las conclusiones.', estado: 'enviada', createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('revisions', null, {});
  }
};
