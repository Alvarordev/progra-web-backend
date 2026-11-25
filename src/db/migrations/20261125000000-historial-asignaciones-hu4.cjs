// Agrega justificación de conflicto e historial auditable de asignaciones para HU4.
module.exports = {
  async up(query, Sequelize) {
    await query.sequelize.transaction(async transaction => {
      await query.addColumn(
        'asignaciones_revision',
        'conflict_justification',
        { type: Sequelize.TEXT, allowNull: true },
        { transaction }
      );

      await query.createTable(
        'historial_asignaciones',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          action: {
            type: Sequelize.ENUM('assigned', 'reassigned', 'removed'),
            allowNull: false,
          },
          reason: { type: Sequelize.TEXT, allowNull: true },
          conflict_justification: { type: Sequelize.TEXT, allowNull: true },
          due_date: { type: Sequelize.DATEONLY, allowNull: false },
          created_at: { type: Sequelize.DATE, allowNull: false },
          work_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'trabajos', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          reviewer_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'usuarios', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
          previous_reviewer_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'usuarios', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
          performed_by_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'usuarios', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
        },
        { transaction }
      );

      await query.addIndex('historial_asignaciones', ['work_id', 'created_at'], {
        transaction,
      });
    });
  },

  async down(query) {
    await query.sequelize.transaction(async transaction => {
      await query.dropTable('historial_asignaciones', { transaction });
      await query.dropEnum('enum_historial_asignaciones_action', { transaction });
      await query.removeColumn('asignaciones_revision', 'conflict_justification', {
        transaction,
      });
    });
  },
};
