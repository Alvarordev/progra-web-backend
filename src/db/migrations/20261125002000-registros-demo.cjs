module.exports = {
  async up(query, Sequelize) {
    await query.createTable('registros_demo', {
      seeder: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
      filas: { type: Sequelize.JSONB, allowNull: false },
    });
  },

  async down(query) {
    await query.dropTable('registros_demo');
  },
};
