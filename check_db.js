const { sequelize } = require('./src/config/database');

async function checkTable() {
  try {
    const [results] = await sequelize.query("DESCRIBE `supplier_quotes`").catch(() => [[]]);
    console.log('Columns in supplier_quotes:', results.map(r => r.Field));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkTable();
