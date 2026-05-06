const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const UserModel = require('./UserModel');

const ValidationModel = sequelize.define('Validation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: UserModel,
      key: 'id'
    }
  },
  inputIdea: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  demandScore: {
    type: DataTypes.INTEGER,
  },
  competitionScore: {
    type: DataTypes.INTEGER,
  },
  riskLevel: {
    type: DataTypes.STRING,
  },
  verdict: {
    type: DataTypes.STRING,
  }
}, {
  tableName: 'validations',
  timestamps: true,
});

// Associations
UserModel.hasMany(ValidationModel, { foreignKey: 'userId' });
ValidationModel.belongsTo(UserModel, { foreignKey: 'userId' });

module.exports = ValidationModel;
