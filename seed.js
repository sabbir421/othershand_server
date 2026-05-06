const { sequelize } = require('./src/config/database');
const UserModel = require('./src/models/UserModel');
const PlanModel = require('./src/models/PlanModel');
const ProductModel = require('./src/models/ProductModel');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    await sequelize.sync({ force: true }); // WARNING: This clears the database!
    console.log('Database synced (cleared for seeding)');

    // 1. Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    await UserModel.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      plan: 'pro'
    });
    console.log('Admin user created: admin@example.com / admin123');

    // 2. Create Standard User
    const userPassword = await bcrypt.hash('user123', 10);
    await UserModel.create({
      name: 'Test User',
      email: 'user@example.com',
      password: userPassword,
      role: 'user',
      plan: 'free'
    });
    console.log('Standard user created: user@example.com / user123');

    // 3. Create initial Subscription Plan
    await PlanModel.create({
      name: 'Pro Monthly',
      price: 29.99,
      isActive: true
    });
    console.log('Initial plan created');

    // 4. Create some Mock Winning Products
    await ProductModel.bulkCreate([
      {
        title: 'Silicone Collapsible Measuring Cups',
        category: 'Kitchen',
        price: 24.99,
        cost: 8.50,
        profit: 12.40,
        roi: 145.88,
        demandScore: 8,
        competitionScore: 4,
        supplierLink: 'https://alibaba.com',
      },
      {
        title: 'Portable Electric Protein Shaker',
        category: 'Fitness',
        price: 34.99,
        cost: 12.00,
        profit: 15.50,
        roi: 129.16,
        demandScore: 9,
        competitionScore: 6,
        supplierLink: 'https://alibaba.com',
      }
    ]);
    console.log('Mock products created');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seed();
