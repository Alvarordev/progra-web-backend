'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class trabajo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.usuario, { as: 'autor', foreignKey: 'autorId' });
      this.hasMany(models.revision, { as: 'revisiones', foreignKey: 'trabajoId' });
      this.hasOne(models.decision, { as: 'decision', foreignKey: 'trabajoId' });
    }
  }
  trabajo.init({
    codigo: DataTypes.STRING,
    titulo: DataTypes.STRING,
    eje: DataTypes.STRING,
    tipo: DataTypes.STRING,
    estado: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'trabajo',
  });
  return trabajo;
};