const { sequelize } = require('./src/config/database');
const ProductModel = require('./src/models/ProductModel');
const ProductRequestModel = require('./src/models/ProductRequestModel');

async function fixDatabase() {
  try {
    console.log('Connecting to database...');
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    // 1. Create product_requests table if it doesn't exist
    if (!tables.includes('product_requests')) {
      console.log('Creating product_requests table...');
      await ProductRequestModel.sync();
    }

    // 2. Add missing columns to products table
    const productCols = await queryInterface.describeTable('products');
    
    if (!productCols.keywords) {
      console.log('Adding keywords column to products...');
      await queryInterface.addColumn('products', 'keywords', {
        type: require('sequelize').DataTypes.JSON,
        allowNull: true
      });
    }

    if (!productCols.description) {
      console.log('Adding description column to products...');
      await queryInterface.addColumn('products', 'description', {
        type: require('sequelize').DataTypes.TEXT,
        allowNull: true
      });
    }

    if (!productCols.supplierLinks) {
      console.log('Adding supplierLinks column to products...');
      await queryInterface.addColumn('products', 'supplierLinks', {
        type: require('sequelize').DataTypes.JSON,
        allowNull: true
      });
    }

    // Check if supplierLink (singular) exists and rename/migrate if needed
    if (productCols.supplierLink && !productCols.supplierLinks) {
       // This part is tricky, let's just ensure supplierLinks exists
    }

    console.log('Database fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database fix failed:', error);
    process.exit(1);
  }
}

fixDatabase();
