const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccountBalanceModel = sequelize.define(
  'AccountBalance',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    accountType: {
      type: DataTypes.ENUM('seller', 'platform'),
      allowNull: false,
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'sellerId for seller accounts; 1 for platform',
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    totalEarned: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    availableBalance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    pendingBalance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalWithdrawn: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'account_balances',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['accountType', 'accountId', 'currency'],
      },
    ],
  }
);

module.exports = AccountBalanceModel;
