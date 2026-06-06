const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ResearchModel = sequelize.define('Research', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  productKeyword: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  marketplace: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  seasonal: {
    type: DataTypes.STRING,
    defaultValue: 'no',
  },
  trend: {
    type: DataTypes.STRING,
    defaultValue: 'up',
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  suggestedPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  referenceLink: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  bsr: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reviews: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  weight: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // AI Insights
  demandScore: {
    type: DataTypes.INTEGER,
  },
  competitionScore: {
    type: DataTypes.INTEGER,
  },
  profitabilityScore: {
    type: DataTypes.INTEGER,
  },
  riskScore: {
    type: DataTypes.INTEGER,
  },
  opportunityScore: {
    type: DataTypes.INTEGER,
  },
  opportunityLevel: {
    type: DataTypes.STRING,
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
  referenceProducts: {
    type: DataTypes.JSON, // Array of up to 5 reference products with detailed metrics
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = ResearchModel;
