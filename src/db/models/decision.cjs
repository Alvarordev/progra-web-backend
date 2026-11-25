'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class decision extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.trabajo, { as: 'trabajo', foreignKey: 'trabajoId' });
    }
  }
  decision.init({
    resultado: DataTypes.STRING,
    retroalimentacion: DataTypes.STRING,
    estado: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'decision',
  });
  return decision;
};