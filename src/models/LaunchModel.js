const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LaunchModel = sequelize.define('LaunchPlan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Basic Info
  category: { type: DataTypes.STRING },
  subCategory: { type: DataTypes.STRING },
  primaryKeyword: { type: DataTypes.STRING },
  nicheLink: { type: DataTypes.TEXT },
  productLink: { type: DataTypes.TEXT },
  bsr: { type: DataTypes.INTEGER },
  reviews: { type: DataTypes.INTEGER },
  weight: { type: DataTypes.STRING },
  age: { type: DataTypes.STRING },
  dimension: { type: DataTypes.STRING },
  
  // Sourcing & Shipping
  unitCount: { type: DataTypes.INTEGER },
  costPerUnit: { type: DataTypes.DECIMAL(10, 2) },
  customBag: { type: DataTypes.DECIMAL(10, 2) },
  shippingAir: { type: DataTypes.DECIMAL(10, 2) },
  shippingSea: { type: DataTypes.DECIMAL(10, 2) },
  
  // Sales & Fees
  retailPrice: { type: DataTypes.DECIMAL(10, 2) },
  amazonFeeFba: { type: DataTypes.DECIMAL(10, 2) },
  tacosPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 25.00 },
  
  // Calculated Results (Stored for history)
  landingCostAir: { type: DataTypes.DECIMAL(10, 2) },
  landingCostSea: { type: DataTypes.DECIMAL(10, 2) },
  netProfitAir: { type: DataTypes.DECIMAL(10, 2) },
  netProfitSea: { type: DataTypes.DECIMAL(10, 2) },
  marginAir: { type: DataTypes.DECIMAL(10, 2) },
  marginSea: { type: DataTypes.DECIMAL(10, 2) },
}, {
  timestamps: true,
});

module.exports = LaunchModel;
