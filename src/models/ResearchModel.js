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
    type: DataTypes.STRING,
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
  competitionLevel: {
    type: DataTypes.STRING, // Low / Medium / High
  },
  riskLevel: {
    type: DataTypes.STRING, // Low / Medium / High
  },
  verdict: {
    type: DataTypes.STRING, // STRONG BUY / BUY / RISKY / AVOID
  },
  reasoning: {
    type: DataTypes.TEXT,
  },
  howToWin: {
    type: DataTypes.TEXT, // Store 3 actionable strategies as JSON string or text
  },
  referenceProducts: {
    type: DataTypes.JSON, // Array of up to 5 reference products with detailed metrics
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = ResearchModel;
