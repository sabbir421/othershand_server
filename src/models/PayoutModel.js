const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayoutModel = sequelize.define('Payout', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bankDetails: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'rejected'),
    defaultValue: 'pending',
  },
  adminNotes: {
    type: DataTypes.TEXT,
  },
  completedAt: {
    type: DataTypes.DATE,
  }
}, {
  tableName: 'payouts',
  timestamps: true,
});

module.exports = PayoutModel;
