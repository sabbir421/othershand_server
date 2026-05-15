const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FbaStorageFee = sequelize.define('FbaStorageFee', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  monthRange: {
    type: DataTypes.STRING, // e.g., "Jan-Sep", "Oct-Dec"
    allowNull: false,
  },
  ratePerCubicFoot: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  marketplace: {
    type: DataTypes.STRING,
    defaultValue: 'US',
  }
}, {
  timestamps: true,
});

module.exports = FbaStorageFee;
