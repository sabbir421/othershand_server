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
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  bsr: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reviews: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  weight: {
    type: DataTypes.STRING,
    allowNull: false,
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
}, {
  timestamps: true,
});

module.exports = ResearchModel;
