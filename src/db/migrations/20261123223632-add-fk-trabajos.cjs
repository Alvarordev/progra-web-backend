'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Un usuario (autor) tiene muchos trabajos
    await queryInterface.addColumn('trabajos', 'autorId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios', // Nombre exacto de la tabla en la BD
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('trabajos', 'autorId');
  }
};
