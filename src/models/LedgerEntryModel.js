const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LedgerEntryModel = sequelize.define(
  'LedgerEntry',
  {
    id: {
      type: DataTypes.BIGINT,
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
    },
    entryType: {
      type: DataTypes.ENUM(
        'sale_credit',
        'platform_fee',
        'payout_reserve',
        'payout_debit',
        'payout_reversal',
        'adjustment'
      ),
      allowNull: false,
    },
    direction: {
      type: DataTypes.ENUM('credit', 'debit'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    referenceType: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: 'ledger_entries',
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = LedgerEntryModel;
