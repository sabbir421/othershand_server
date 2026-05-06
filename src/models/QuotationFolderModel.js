const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuotationFolderModel = sequelize.define('QuotationFolder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  folderName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'quotation_folders',
  timestamps: true,
});

module.exports = QuotationFolderModel;
