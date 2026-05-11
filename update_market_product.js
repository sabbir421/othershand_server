const MarketProductModel = require('./src/models/MarketProductModel');
require('dotenv').config();

async function updateMarketProduct() {
  try {
    await MarketProductModel.update(
      { 
        vaultContents: [
          "High-Resolution Factory Inspection Images",
          "Tactical Negotiation & Contract Scripts",
          "Patent Integrity & Trademark Reports",
          "Full Logistics Blueprint (Air/Sea landed costs)"
        ] 
      },
      { where: { id: 1 } }
    );
    console.log('Updated market product vault contents.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

updateMarketProduct();
