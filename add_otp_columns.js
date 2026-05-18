require('dotenv').config();
const { sequelize, connectDB } = require('./src/config/database');
const UserModel = require('./src/models/UserModel');
const SellerModel = require('./src/models/SellerModel');

const run = async () => {
  await connectDB();
  console.log('Syncing UserModel...');
  await UserModel.sync({ alter: true });
  console.log('Syncing SellerModel...');
  await SellerModel.sync({ alter: true });
  console.log('Done!');
  process.exit(0);
};

run();
