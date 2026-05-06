const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductModel = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  profit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  roi: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  demandScore: {
    type: DataTypes.INTEGER,
  },
  competitionScore: {
    type: DataTypes.INTEGER,
  },
  supplierLinks: {
    type: DataTypes.JSON, // Stores array of strings
  },
  images: {
    type: DataTypes.JSON, // Stores array of strings
  },
  keywords: {
    type: DataTypes.JSON, // Stores array of strings
  },
  description: {
    type: DataTypes.TEXT,
  },
  googleTrendsLink: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'products',
  timestamps: true,
});

module.exports = ProductModel;
