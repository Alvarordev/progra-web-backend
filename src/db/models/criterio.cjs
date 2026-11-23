'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class criterio extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.revisionCriterio, { as: 'notas', foreignKey: 'criterioId' });
    }
  }
  criterio.init({
    nombre: DataTypes.STRING,
    descripcion: DataTypes.STRING,
    peso: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'criterio',
  });
  return criterio;
};