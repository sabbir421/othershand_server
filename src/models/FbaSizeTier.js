const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FbaSizeTier = sequelize.define('FbaSizeTier', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  maxLength: { type: DataTypes.DECIMAL(10, 2) },
  maxWidth: { type: DataTypes.DECIMAL(10, 2) },
  maxHeight: { type: DataTypes.DECIMAL(10, 2) },
  maxWeight: { type: DataTypes.DECIMAL(10, 2) },
  baseFee: { type: DataTypes.DECIMAL(10, 2) },
  perLbSurcharge: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  surchargeThresholdWeight: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  marketplace: {
    type: DataTypes.STRING,
    defaultValue: 'US',
  }
}, {
  timestamps: true,
});

module.exports = FbaSizeTier;
