const UserModel = require('./src/models/UserModel');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestData() {
  try {
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    const testUsers = [
      { name: 'John Doe', email: 'john@example.com', password, role: 'user', plan: 'free' },
      { name: 'Jane Smith', email: 'jane@example.com', password, role: 'user', plan: 'pro', subscriptionStatus: 'active' },
      { name: 'Mike Ross', email: 'mike@example.com', password, role: 'user', plan: 'pro', subscriptionStatus: 'active' },
    ];

    for (const u of testUsers) {
      await UserModel.findOrCreate({
        where: { email: u.email },
        defaults: u
      });
    }

    console.log('Test users created successfully.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

createTestData();
