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
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  sellerEarnings: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  platformFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  feeRatePlatform: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
  },
  feeRateSeller: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  },
  paymentProvider: {
    type: DataTypes.STRING(16),
    allowNull: true,
    defaultValue: 'paddle',
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
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ledgerProcessedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'market_purchases',
  timestamps: true,
});

module.exports = MarketPurchaseModel;
