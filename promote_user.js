const UserModel = require('./src/models/UserModel');
require('dotenv').config();

async function promoteUser() {
  try {
    const [updated] = await UserModel.update(
      { role: 'admin' },
      { where: { email: 'sabbiralazim@gmail.com' } }
    );
    if (updated) {
      console.log('User sabbiralazim@gmail.com promoted to admin.');
    } else {
      console.log('User not found.');
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

promoteUser();
