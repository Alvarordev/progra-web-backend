'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Criterios de evaluación (los mismos del frontend). Los pesos suman 100.
    await queryInterface.bulkInsert('criterios', [
      { nombre: 'Originalidad', descripcion: 'Aporte novedoso frente a la literatura consultada.', peso: 25, createdAt: new Date(), updatedAt: new Date() },
      { nombre: 'Rigor metodológico', descripcion: 'Coherencia del diseño, los datos y el análisis.', peso: 30, createdAt: new Date(), updatedAt: new Date() },
      { nombre: 'Claridad de la exposición', descripcion: 'Redacción, estructura y calidad de las figuras.', peso: 20, createdAt: new Date(), updatedAt: new Date() },
      { nombre: 'Relevancia y aporte', descripcion: 'Pertinencia para el eje temático y utilidad práctica.', peso: 25, createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('criterios', null, {});
  }
};
