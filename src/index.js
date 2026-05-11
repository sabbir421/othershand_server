require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, connectDB } = require('./config/database');

// Import Models
require('./models/UserModel');
require('./models/ProductModel');
require('./models/ValidationModel');
require('./models/PlanModel');
require('./models/ResearchModel');
require('./models/LaunchModel');
require('./models/SupplierModel');
require('./models/ProductRequestModel');
require('./models/QuotationFolderModel');
require('./models/SellerModel');
require('./models/MarketProductModel');
require('./models/MarketPurchaseModel');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const { webhook } = require('./controller/stripeController');
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), webhook);

app.use(express.json());

const routes = require('./routes/route');
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('FBA SaaS API is running');
});

const PORT = process.env.PORT || 8000;

const addColumnIfNotExists = async (tableName, columnName, definition) => {
  try {
    const [results] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${columnName}'`);
    if (results.length === 0) {
      await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
      console.log(`Added column ${columnName} to ${tableName}`);
    }
  } catch (err) {
    console.error(`Error adding column ${columnName} to ${tableName}:`, err.message);
  }
};

const startServer = async () => {
  await connectDB();
  
  // Base sync
  await sequelize.sync();
  
  // Manual Sync for Products
  await addColumnIfNotExists('products', 'googleTrendsLink', 'VARCHAR(255) NULL');

  // Manual Sync for Product Requests
  await addColumnIfNotExists('product_requests', 'sellerId', 'INT NULL');

  // Manual Sync for Supplier Quotes (Restore missing columns)
  await addColumnIfNotExists('supplier_quotes', 'productName', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('supplier_quotes', 'quantity', 'INT NULL');
  await addColumnIfNotExists('supplier_quotes', 'weight', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('supplier_quotes', 'materialType', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('supplier_quotes', 'productDimension', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('supplier_quotes', 'folderId', 'INT NULL');
  await addColumnIfNotExists('supplier_quotes', 'sellerName', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('supplier_quotes', 'productUrl', 'TEXT NULL');
  await addColumnIfNotExists('supplier_quotes', 'storeUrl', 'TEXT NULL');
  await addColumnIfNotExists('supplier_quotes', 'unitPrice', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('supplier_quotes', 'shipmentDuration', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('supplier_quotes', 'shippingAir', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('supplier_quotes', 'shippingDurationAir', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('supplier_quotes', 'shippingSea', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('supplier_quotes', 'shippingDurationSea', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('supplier_quotes', 'samplePrice', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('supplier_quotes', 'sampleDuration', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('supplier_quotes', 'shippingCost', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('supplier_quotes', 'shippingTime', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('supplier_quotes', 'packagingPrice', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('supplier_quotes', 'finalUnitPriceAir', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('supplier_quotes', 'finalUnitPriceSea', 'DECIMAL(10, 2) NULL');

  // Market Products expansion
  try {
    await sequelize.query(`ALTER TABLE \`market_products\` MODIFY COLUMN \`mainImage\` TEXT`);
    console.log('Updated market_products.mainImage to TEXT');
  } catch (err) {
    console.error('Error updating mainImage:', err.message);
  }

  await addColumnIfNotExists('market_products', 'vaultContents', 'JSON NULL');
  await addColumnIfNotExists('market_products', 'expectedProfitMargin', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('market_products', 'viewCount', 'INT DEFAULT 0');
  await addColumnIfNotExists('plans', 'features', 'JSON NULL');

  console.log('Database sync sequence completed');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
