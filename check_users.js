const UserModel = require('./src/models/UserModel');
require('dotenv').config();

async function checkUsers() {
  try {
    const users = await UserModel.findAll({
      attributes: ['name', 'email', 'role']
    });
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkUsers();
