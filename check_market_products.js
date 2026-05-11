const MarketProductModel = require('./src/models/MarketProductModel');
require('dotenv').config();

async function checkMarketProducts() {
  try {
    const products = await MarketProductModel.findAll();
    console.log(JSON.stringify(products, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkMarketProducts();
