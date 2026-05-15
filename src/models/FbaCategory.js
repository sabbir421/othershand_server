const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FbaCategory = sequelize.define('FbaCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  referralFeePercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  minReferralFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  marketplace: {
    type: DataTypes.STRING,
    defaultValue: 'US',
  }
}, {
  timestamps: true,
});

module.exports = FbaCategory;
