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
      key: 'id',
    },
  },
  launchPlanId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  launchSnapshot: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  inputIdea: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  productKeyword: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  marketplace: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  seasonal: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  trend: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  referenceProducts: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  demandScore: {
    type: DataTypes.INTEGER,
  },
  competitionScore: {
    type: DataTypes.INTEGER,
  },
  profitabilityScore: {
    type: DataTypes.INTEGER,
  },
  reviewBarrierScore: {
    type: DataTypes.INTEGER,
  },
  priceOpportunityScore: {
    type: DataTypes.INTEGER,
  },
  logisticsScore: {
    type: DataTypes.INTEGER,
  },
  trendStabilityScore: {
    type: DataTypes.INTEGER,
  },
  opportunityScore: {
    type: DataTypes.INTEGER,
  },
  opportunityLevel: {
    type: DataTypes.STRING,
  },
  positiveSignals: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  challenges: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  beginnerStrategy: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  competitionLevel: {
    type: DataTypes.STRING,
  },
  riskLevel: {
    type: DataTypes.STRING,
  },
  verdict: {
    type: DataTypes.STRING,
  },
  reasoning: {
    type: DataTypes.TEXT,
  },
  howToWin: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'validations',
  timestamps: true,
});

UserModel.hasMany(ValidationModel, { foreignKey: 'userId' });
ValidationModel.belongsTo(UserModel, { foreignKey: 'userId' });

module.exports = ValidationModel;
