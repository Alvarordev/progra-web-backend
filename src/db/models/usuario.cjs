'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class usuario extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.trabajo, { as: 'trabajos', foreignKey: 'autorId' });
      this.hasMany(models.revision, { as: 'revisiones', foreignKey: 'revisorId' });
    }
  }
  usuario.init({
    nombre: DataTypes.STRING,
    correo: DataTypes.STRING,
    rol: DataTypes.STRING,
    institucion: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'usuario',
  });
  return usuario;
};