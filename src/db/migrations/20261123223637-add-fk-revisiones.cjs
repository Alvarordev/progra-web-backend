'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Un trabajo tiene una o varias revisiones
    await queryInterface.addColumn('revisions', 'trabajoId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'trabajos', // Nombre exacto de la tabla en la BD
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    // Un usuario (revisor) hace muchas revisiones
    await queryInterface.addColumn('revisions', 'revisorId', {
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
    await queryInterface.removeColumn('revisions', 'trabajoId');
    await queryInterface.removeColumn('revisions', 'revisorId');
  }
};
