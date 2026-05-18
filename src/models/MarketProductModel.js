const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MarketProductModel = sequelize.define('MarketProduct', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  status: {
    type: DataTypes.ENUM('pending', 'active', 'rejected', 'sold', 'hidden'),
    defaultValue: 'pending',
  },
  // We'll store the 5 references as a JSON array for flexibility, 
  // or use a separate table if complex querying is needed.
  // Given the requirement for "full details", a JSON array of objects is efficient.
  references: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of at least 5 reference objects'
  },
  // Summary metrics for the listing preview
  avgBsr: {
    type: DataTypes.INTEGER,
  },
  avgRoi: {
    type: DataTypes.DECIMAL(10, 2),
  },
  monthlySalesEst: {
    type: DataTypes.INTEGER,
  },
  mainImage: {
    type: DataTypes.TEXT,
  },
  vaultContents: {
    type: DataTypes.JSON,
    comment: 'Array of features included in the vault'
  },
  expectedProfitMargin: {
    type: DataTypes.DECIMAL(10, 2),
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'market_products',
  timestamps: true,
});

module.exports = MarketProductModel;
