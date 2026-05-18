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
require('./models/PayoutModel');
require('./models/ReviewModel');

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
const paddleController = require('./controller/paddleController');

app.post('/api/stripe/webhook', express.raw({ type: '*/*' }), webhook);
app.post('/api/paddle/webhook', express.raw({ type: '*/*' }), paddleController.webhook);

app.use(express.json());

const routes = require('./routes/route');
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('FBA SaaS API is running');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
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

  // Manual Sync for Research (pluralized as 'Researches' or 'Research' depending on config)
  const researchTables = ['Researches', 'Research'];
  for (const table of researchTables) {
    await addColumnIfNotExists(table, 'productKeyword', 'VARCHAR(255) NULL');
    await addColumnIfNotExists(table, 'marketplace', 'VARCHAR(255) NULL');
    await addColumnIfNotExists(table, 'seasonal', 'VARCHAR(255) DEFAULT "no"');
    await addColumnIfNotExists(table, 'trend', 'VARCHAR(255) DEFAULT "up"');
    await addColumnIfNotExists(table, 'suggestedPrice', 'DECIMAL(10, 2) NULL');
    await addColumnIfNotExists(table, 'referenceLink', 'VARCHAR(255) NULL');
    await addColumnIfNotExists(table, 'demandScore', 'INT NULL');
    await addColumnIfNotExists(table, 'competitionScore', 'INT NULL');
    await addColumnIfNotExists(table, 'profitabilityScore', 'INT NULL');
    await addColumnIfNotExists(table, 'riskScore', 'INT NULL');
    await addColumnIfNotExists(table, 'opportunityScore', 'INT NULL');
    await addColumnIfNotExists(table, 'competitionLevel', 'VARCHAR(255) NULL');
    await addColumnIfNotExists(table, 'riskLevel', 'VARCHAR(255) NULL');
    await addColumnIfNotExists(table, 'verdict', 'VARCHAR(255) NULL');
    await addColumnIfNotExists(table, 'reasoning', 'TEXT NULL');
    await addColumnIfNotExists(table, 'howToWin', 'TEXT NULL');
    await addColumnIfNotExists(table, 'referenceProducts', 'JSON NULL');
  }

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
  
  // Paddle Integration Sync
  await addColumnIfNotExists('users', 'paddleCustomerId', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('users', 'paddleSubscriptionId', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('users', 'resetOtp', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('users', 'resetOtpExpires', 'DATETIME NULL');
  
  await addColumnIfNotExists('sellers', 'resetOtp', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('sellers', 'resetOtpExpires', 'DATETIME NULL');
  await addColumnIfNotExists('plans', 'features', 'JSON NULL');
  await addColumnIfNotExists('plans', 'paddleProductId', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('plans', 'paddlePriceId', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('market_purchases', 'paddleTransactionId', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('market_purchases', 'sellerEarnings', 'DECIMAL(10, 2) NULL');
  await addColumnIfNotExists('market_purchases', 'platformFee', 'DECIMAL(10, 2) NULL');

  // FBA Fee Engine Seed Data
  const FbaCategory = require('./models/FbaCategory');
  const FbaSizeTier = require('./models/FbaSizeTier');
  const FbaStorageFee = require('./models/FbaStorageFee');

  try {
    const categoryCount = await FbaCategory.count();
    if (categoryCount === 0) {
      await FbaCategory.bulkCreate([
        { name: 'Home & Kitchen', referralFeePercentage: 15.00, minReferralFee: 0.30 },
        { name: 'Electronics', referralFeePercentage: 8.00, minReferralFee: 0.30 },
        { name: 'Apparel', referralFeePercentage: 17.00, minReferralFee: 0.30 },
        { name: 'Beauty', referralFeePercentage: 15.00, minReferralFee: 0.30 },
        { name: 'Toys & Games', referralFeePercentage: 15.00, minReferralFee: 0.30 }
      ]);
      console.log('Seeded FBA categories');
    }

    const tierCount = await FbaSizeTier.count();
    if (tierCount === 0) {
      await FbaSizeTier.bulkCreate([
        { name: 'Small Standard', maxLength: 15, maxWidth: 12, maxHeight: 0.75, maxWeight: 1, baseFee: 3.22 },
        { name: 'Large Standard (< 0.5lb)', maxLength: 18, maxWidth: 14, maxHeight: 8, maxWeight: 0.5, baseFee: 3.86 },
        { name: 'Large Standard (0.5 - 1lb)', maxLength: 18, maxWidth: 14, maxHeight: 8, maxWeight: 1, baseFee: 4.08 },
        { name: 'Large Standard (1 - 2lb)', maxLength: 18, maxWidth: 14, maxHeight: 8, maxWeight: 2, baseFee: 4.75 },
        { name: 'Large Standard (2 - 3lb)', maxLength: 18, maxWidth: 14, maxHeight: 8, maxWeight: 3, baseFee: 5.40 },
        { name: 'Large Bulky', maxLength: 108, maxWidth: 108, maxHeight: 108, maxWeight: 50, baseFee: 9.73, perLbSurcharge: 0.42, surchargeThresholdWeight: 1 }
      ]);
      console.log('Seeded FBA size tiers');
    }

    const storageCount = await FbaStorageFee.count();
    if (storageCount === 0) {
      await FbaStorageFee.bulkCreate([
        { monthRange: 'Jan-Sep', ratePerCubicFoot: 0.78 },
        { monthRange: 'Oct-Dec', ratePerCubicFoot: 2.40 }
      ]);
      console.log('Seeded FBA storage fees');
    }
  } catch (err) {
    console.error('Error seeding FBA data:', err.message);
  }

  console.log('Database sync sequence completed');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
