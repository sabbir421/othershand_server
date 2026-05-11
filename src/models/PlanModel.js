const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlanModel = sequelize.define('Plan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pro Plan',
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stripeProductId: {
    type: DataTypes.STRING,
  },
  stripePriceId: {
    type: DataTypes.STRING,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
  }
}, {
  tableName: 'plans',
  timestamps: true,
});

module.exports = PlanModel;
