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

// @desc    Get All Plans
// @route   GET /api/admin/plans
// @access  Private/Admin
const getAllPlans = async (req, res) => {
  try {
    const plans = await PlanModel.findAll({ order: [['createdAt', 'DESC']] });
    res.json(plans);
  } catch (error) {
    console.error('Get Plans Error:', error);
    res.status(500).json({ message: 'Server Error fetching plans' });
  }
};

// @desc    Create New Subscription Plan
// @route   POST /api/admin/plans
// @access  Private/Admin
const createPlan = async (req, res) => {
  try {
    const { name, price, features } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ message: 'Please provide name and price' });
    }

    console.log('Syncing new plan with Stripe:', { name, price });

    // 1. Create a new Product and Price in Stripe
    const stripeProduct = await stripe.products.create({
      name: name,
      description: 'FBA SaaS Platform Access Tier',
    });

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(parseFloat(price) * 100),
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    // 2. Create the new Plan in DB (Keep others active)
    const newPlan = await PlanModel.create({
      name,
      price,
      features: features || [],
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      isActive: true,
    });

    res.status(201).json({ message: 'New tier deployed successfully', plan: newPlan });
  } catch (error) {
    console.error('Create Plan Error:', error);
    res.status(500).json({ 
      message: error.message || 'Server Error creating plan',
      details: error.raw?.message || null
    });
  }
};

// @desc    Toggle Plan Status
// @route   PUT /api/admin/plans/:id/toggle
// @access  Private/Admin
const togglePlanStatus = async (req, res) => {
  try {
    const plan = await PlanModel.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    
    plan.isActive = !plan.isActive;
    await plan.save();
    
    res.json({ message: `Plan ${plan.isActive ? 'activated' : 'deactivated'}`, plan });
  } catch (error) {
    res.status(500).json({ message: 'Server Error toggling status' });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  getAllPlans,
  createPlan,
  togglePlanStatus
};
