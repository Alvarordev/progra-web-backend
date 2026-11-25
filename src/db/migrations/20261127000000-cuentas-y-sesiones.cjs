module.exports = {
    async up(query, Sequelize) {
        await query.sequelize.transaction(async transaction => {
            await query.createTable('sesiones', {
                sid: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
                sess: { type: Sequelize.JSON, allowNull: false },
                expire: { type: Sequelize.DATE, allowNull: false },
            }, { transaction });
            await query.addIndex('sesiones', ['expire'], { transaction });
            await query.createTable('recuperaciones_contrasena', {
                id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
                usuario_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    references: { model: 'usuarios', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                },
                codigo_hash: { type: Sequelize.STRING(64) },
                token_hash: { type: Sequelize.STRING(64), unique: true },
                vence_en: { type: Sequelize.DATE, allowNull: false },
                intentos: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 0 },
                usada_en: { type: Sequelize.DATE },
                created_at: { type: Sequelize.DATE, allowNull: false },
                updated_at: { type: Sequelize.DATE, allowNull: false },
            }, { transaction });
            await query.addIndex('recuperaciones_contrasena', ['usuario_id', 'created_at'], { transaction });
        });
    },
    async down(query) {
        await query.sequelize.transaction(async transaction => {
            await query.dropTable('recuperaciones_contrasena', { transaction });
            await query.dropTable('sesiones', { transaction });
        });
    },
};
