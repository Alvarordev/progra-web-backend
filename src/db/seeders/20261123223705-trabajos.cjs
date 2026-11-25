'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Buscamos el id de cada autor por su correo
    const [usuarios] = await queryInterface.sequelize.query('SELECT id, correo FROM usuarios');
    const idDe = correo => usuarios.find(u => u.correo === correo).id;

    await queryInterface.bulkInsert('trabajos', [
      { codigo: 'TRB-2026-042', titulo: 'Predicción de deserción universitaria mediante aprendizaje supervisado', eje: 'Inteligencia artificial y datos', tipo: 'Artículo completo', estado: 'En revisión', autorId: idDe('rosa.quispe@aloe.ulima.edu.pe'), createdAt: new Date(), updatedAt: new Date() },
      { codigo: 'TRB-2026-051', titulo: 'Evaluación del uso de agua reciclada en riego de áreas verdes del campus', eje: 'Sostenibilidad y ciudad', tipo: 'Resumen extendido', estado: 'Aceptado', autorId: idDe('rosa.quispe@aloe.ulima.edu.pe'), createdAt: new Date(), updatedAt: new Date() },
      { codigo: 'TRB-2026-057', titulo: 'Tablero de indicadores para la gestión de residuos sólidos en Surco', eje: 'Sostenibilidad y ciudad', tipo: 'Caso de estudio', estado: 'Rechazado', autorId: idDe('diego.chavez@aloe.ulima.edu.pe'), createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('trabajos', null, {});
  }
};
