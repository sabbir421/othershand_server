const { sequelize } = require('./src/config/database');
const QuotationFolderModel = require('./src/models/QuotationFolderModel');

async function checkFolders() {
  try {
    const folders = await QuotationFolderModel.findAll();
    console.log('Total folders in DB:', folders.length);
    console.log('Folders:', folders.map(f => ({ id: f.id, userId: f.userId, folderName: f.folderName })));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkFolders();
