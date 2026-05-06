const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierModel = sequelize.define('SupplierQuote', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productName: { type: DataTypes.STRING },
  folderId: { 
    type: DataTypes.INTEGER,
    allowNull: true, 
  },
  sellerName: { type: DataTypes.STRING },
  quantity: { type: DataTypes.INTEGER },
  weight: { type: DataTypes.DECIMAL(10, 2) },
  materialType: { type: DataTypes.STRING },
  productDimension: { type: DataTypes.STRING },
  productUrl: { type: DataTypes.TEXT },
  storeUrl: { type: DataTypes.TEXT },
  
  unitPrice: { type: DataTypes.DECIMAL(10, 2) },
  shipmentDuration: { type: DataTypes.STRING },
  
  shippingAir: { type: DataTypes.DECIMAL(10, 2) },
  shippingDurationAir: { type: DataTypes.STRING },
  shippingSea: { type: DataTypes.DECIMAL(10, 2) },
  shippingDurationSea: { type: DataTypes.STRING },
  
  samplePrice: { type: DataTypes.DECIMAL(10, 2) },
  sampleDuration: { type: DataTypes.STRING },
  
  packagingPrice: { type: DataTypes.DECIMAL(10, 2) },
  finalUnitPriceAir: { type: DataTypes.DECIMAL(10, 2) },
  finalUnitPriceSea: { type: DataTypes.DECIMAL(10, 2) },
}, {
  tableName: 'supplier_quotes',
  timestamps: true,
});

const QuotationFolderModel = require('./QuotationFolderModel');
SupplierModel.belongsTo(QuotationFolderModel, { foreignKey: 'folderId', as: 'folder' });
QuotationFolderModel.hasMany(SupplierModel, { foreignKey: 'folderId', as: 'quotes' });

module.exports = SupplierModel;
