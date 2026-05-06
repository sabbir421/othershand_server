const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductRequestModel = sequelize.define('ProductRequest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  minPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  maxPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  marketplace: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'fulfilled', 'cancelled'),
    defaultValue: 'pending',
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Link to the winning product when fulfilled
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Link to the seller who accepted the request
  },
}, {
  tableName: 'product_requests',
  timestamps: true,
});

const ProductModel = require('./ProductModel');

ProductRequestModel.belongsTo(ProductModel, { foreignKey: 'productId', as: 'product' });

module.exports = ProductRequestModel;
