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
  marketplace: {
    type: DataTypes.STRING,
    allowNull: true,
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
  blueprintPreview: {
    type: DataTypes.JSON,
    comment: 'AI-generated pre-purchase blueprint preview report',
  },
  expectedProfitMargin: {
    type: DataTypes.DECIMAL(10, 2),
  },
  seasonal: {
    type: DataTypes.STRING,
    defaultValue: 'no',
  },
  trend: {
    type: DataTypes.STRING,
    defaultValue: 'up',
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  topKeywords: {
    type: DataTypes.JSON,
    comment: 'Optional array of up to 20 top keywords (visible after purchase)',
  },
  supplierLinks: {
    type: DataTypes.JSON,
    comment: 'Optional array of up to 5 verified supplier URLs (visible after purchase)',
  },
  bulletPoints: {
    type: DataTypes.JSON,
    comment: 'Optional array of up to 8 bullet points (visible after purchase)',
  },
}, {
  tableName: 'market_products',
  timestamps: true,
});

module.exports = MarketProductModel;
