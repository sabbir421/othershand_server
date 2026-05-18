require('dotenv').config();
const { sequelize, connectDB } = require('./src/config/database');

const addColumnIfNotExists = async (tableName, columnName, definition) => {
  try {
    const [results] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${columnName}'`);
    if (results.length === 0) {
      await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
      console.log(`Added column ${columnName} to ${tableName}`);
    } else {
      console.log(`Column ${columnName} already exists in ${tableName}`);
    }
  } catch (err) {
    console.error(`Error adding column ${columnName} to ${tableName}:`, err.message);
  }
};

const run = async () => {
  await connectDB();
  await addColumnIfNotExists('users', 'resetOtp', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('users', 'resetOtpExpires', 'DATETIME NULL');
  await addColumnIfNotExists('sellers', 'resetOtp', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('sellers', 'resetOtpExpires', 'DATETIME NULL');
  console.log('Done!');
  process.exit(0);
};

run();
