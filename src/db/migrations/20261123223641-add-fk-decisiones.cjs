'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Un trabajo tiene una decisión final del comité
    await queryInterface.addColumn('decisions', 'trabajoId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'trabajos', // Nombre exacto de la tabla en la BD
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('decisions', 'trabajoId');
  }
};
