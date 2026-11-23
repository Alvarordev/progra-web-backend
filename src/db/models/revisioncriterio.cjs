'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class revisionCriterio extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.revision, { as: 'revision', foreignKey: 'revisionId' });
      this.belongsTo(models.criterio, { as: 'criterio', foreignKey: 'criterioId' });
    }
  }
  revisionCriterio.init({
    puntaje: DataTypes.INTEGER,
    comentario: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'revisionCriterio',
  });
  return revisionCriterio;
};