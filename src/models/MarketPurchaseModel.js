const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MarketPurchaseModel = sequelize.define('MarketPurchase', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  marketProductId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stripeSessionId: {
    type: DataTypes.STRING,
  },
  paddleTransactionId: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
  }
}, {
  tableName: 'market_purchases',
  timestamps: true,
});

module.exports = MarketPurchaseModel;
