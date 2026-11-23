'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Buscamos el id de cada trabajo por su código
    const [trabajos] = await queryInterface.sequelize.query('SELECT id, codigo FROM trabajos');
    const trabajo = codigo => trabajos.find(t => t.codigo === codigo).id;

    // Parte comité: veredicto final de cada trabajo
    await queryInterface.bulkInsert('decisions', [
      { trabajoId: trabajo('TRB-2026-051'), resultado: 'aceptar', retroalimentacion: 'El trabajo cumple los criterios del congreso.', estado: 'publicada', createdAt: new Date(), updatedAt: new Date() },
      { trabajoId: trabajo('TRB-2026-057'), resultado: 'rechazar', retroalimentacion: 'La metodología no sustenta las conclusiones.', estado: 'publicada', createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('decisions', null, {});
  }
};
