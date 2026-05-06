const UserModel = require('../models/UserModel');
const PlanModel = require('../models/PlanModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_to_prevent_startup_crash');

// @desc    Get Admin Statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await UserModel.count({ where: { role: 'user' } });
    const totalSubscribers = await UserModel.count({ 
      where: { role: 'user', subscriptionStatus: 'active' } 
    });
    
    const activePlan = await PlanModel.findOne({ where: { isActive: true } });
    const planPrice = activePlan ? parseFloat(activePlan.price) : 0;
    
    // Monthly Recurring Revenue estimate based on active subscribers
    const totalRevenue = totalSubscribers * planPrice;

    res.json({
      totalUsers,
      totalSubscribers,
      totalRevenue
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ message: 'Server Error fetching stats' });
  }
};

// @desc    Get All Users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.findAll({
      attributes: ['id', 'name', 'email', 'plan', 'role', 'subscriptionStatus', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Server Error fetching users' });
  }
};

// @desc    Get Current Plan
// @route   GET /api/admin/plan
// @access  Private/Admin
const getCurrentPlan = async (req, res) => {
  try {
    const activePlan = await PlanModel.findOne({ where: { isActive: true } });
    res.json(activePlan || { name: 'Pro Plan', price: 0 });
  } catch (error) {
    console.error('Get Plan Error:', error);
    res.status(500).json({ message: 'Server Error fetching plan' });
  }
};

// @desc    Update Subscription Plan (Price)
// @route   POST /api/admin/plan
// @access  Private/Admin
const updatePlan = async (req, res) => {
  try {
    const { name, price } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ message: 'Please provide name and price' });
    }

    // 1. We first create a new Product (or use existing) and a new Price in Stripe
    const stripeProduct = await stripe.products.create({
      name: name,
      description: 'FBA SaaS Platform Access',
    });

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(parseFloat(price) * 100), // Stripe expects cents
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    // 2. Mark old plans as inactive in DB
    await PlanModel.update({ isActive: false }, { where: { isActive: true } });

    // 3. Create the new Plan in DB
    const newPlan = await PlanModel.create({
      name,
      price,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      isActive: true,
    });

    res.status(201).json({ message: 'Plan updated successfully', plan: newPlan });
  } catch (error) {
    console.error('Update Plan Error:', error);
    res.status(500).json({ message: error.message || 'Server Error updating plan' });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  getCurrentPlan,
  updatePlan
};
