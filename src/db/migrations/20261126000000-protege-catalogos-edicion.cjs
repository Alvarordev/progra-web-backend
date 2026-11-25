async function actualizarReferencias(query, onDelete) {
  await query.sequelize.transaction(async transaction => {
    for (const [origen, campo, destino] of [
      ['trabajos', 'thematic_axis_id', 'ejes_tematicos'],
      ['trabajos', 'work_type_id', 'tipos_trabajo'],
      ['sesiones_programa', 'thematic_axis_id', 'ejes_tematicos'],
    ]) {
      const name = `${origen}_${campo}_fkey`;
      await query.removeConstraint(origen, name, { transaction });
      await query.addConstraint(origen, {
        name,
        fields: [campo],
        type: 'foreign key',
        references: { table: destino, field: 'id' },
        onDelete,
        onUpdate: 'CASCADE',
        transaction,
      });
    }
  });
}

module.exports = {
  up: query => actualizarReferencias(query, 'RESTRICT'),
  down: query => actualizarReferencias(query, 'CASCADE'),
};
