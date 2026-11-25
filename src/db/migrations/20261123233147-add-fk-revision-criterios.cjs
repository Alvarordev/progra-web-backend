'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Una revisión tiene varias notas (una por criterio)
    await queryInterface.addColumn('revisionCriterios', 'revisionId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'revisions', // Nombre exacto de la tabla en la BD
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // si se borra la revisión, se borran sus notas
    });
    // Un criterio aparece en muchas notas
    await queryInterface.addColumn('revisionCriterios', 'criterioId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'criterios', // Nombre exacto de la tabla en la BD
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    // Una revisión no puede calificar dos veces el mismo criterio
    await queryInterface.addConstraint('revisionCriterios', {
      fields: ['revisionId', 'criterioId'],
      type: 'unique',
      name: 'revision_criterio_unico',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeConstraint('revisionCriterios', 'revision_criterio_unico');
    await queryInterface.removeColumn('revisionCriterios', 'revisionId');
    await queryInterface.removeColumn('revisionCriterios', 'criterioId');
  }
};
