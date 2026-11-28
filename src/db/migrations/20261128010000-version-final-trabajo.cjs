// Enlace de la versión final que sube el autor de un trabajo aceptado.
module.exports = {
  up: query => query.addColumn('trabajos', 'final_document_url', {
    type: 'VARCHAR(500)',
    allowNull: true,
  }),
  down: query => query.removeColumn('trabajos', 'final_document_url'),
};
