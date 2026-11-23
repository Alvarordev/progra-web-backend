'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Usuarios de ejemplo (los mismos del README del proyecto)
    await queryInterface.bulkInsert('usuarios', [
      { nombre: 'Rosa María Quispe Ttito', correo: 'rosa.quispe@aloe.ulima.edu.pe', rol: 'autor', institucion: 'Universidad de Lima', createdAt: new Date(), updatedAt: new Date() },
      { nombre: 'Diego Alonso Chávez Manrique', correo: 'diego.chavez@aloe.ulima.edu.pe', rol: 'autor', institucion: 'Universidad de Lima', createdAt: new Date(), updatedAt: new Date() },
      { nombre: 'Mg. Luis Ramírez Cárdenas', correo: 'luis.ramirez@ulima.edu.pe', rol: 'revisor', institucion: 'Universidad de Lima', createdAt: new Date(), updatedAt: new Date() },
      { nombre: 'Dr. Óscar Nakamura Trigoso', correo: 'onakamura@pucp.edu.pe', rol: 'revisor', institucion: 'Pontificia Universidad Católica', createdAt: new Date(), updatedAt: new Date() },
      { nombre: 'Mg. Carmen Effio Vargas', correo: 'carmen.effio@ulima.edu.pe', rol: 'revisor', institucion: 'Universidad de Lima', createdAt: new Date(), updatedAt: new Date() },
      { nombre: 'Dra. Ana Salazar Bermúdez', correo: 'ana.salazar@ulima.edu.pe', rol: 'comite', institucion: 'Universidad de Lima', createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('usuarios', null, {});
  }
};
