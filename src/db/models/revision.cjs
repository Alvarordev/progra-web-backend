'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class revision extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.trabajo, { as: 'trabajo', foreignKey: 'trabajoId' });
      this.belongsTo(models.usuario, { as: 'revisor', foreignKey: 'revisorId' });
    }
  }
  revision.init({
    puntaje: DataTypes.INTEGER,
    recomendacion: DataTypes.STRING,
    comentario: DataTypes.STRING,
    estado: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'revision',
  });
  return revision;
};