const { sequelize } = require('./src/config/database');
const SupplierModel = require('./src/models/SupplierModel');

async function checkQuotes() {
  try {
    const quotes = await SupplierModel.findAll();
    console.log('Total quotes in DB:', quotes.length);
    console.log('Quotes:', quotes.map(q => ({ id: q.id, userId: q.userId, productName: q.productName })));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkQuotes();
