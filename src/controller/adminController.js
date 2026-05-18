const UserModel = require('../models/UserModel');
const PlanModel = require('../models/PlanModel');
const MarketProductModel = require('../models/MarketProductModel');
const MarketPurchaseModel = require('../models/MarketPurchaseModel');
const SellerModel = require('../models/SellerModel');
const PayoutModel = require('../models/PayoutModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_to_prevent_startup_crash');
const { sequelize } = require('../config/database');

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
    
    const totalRevenue = totalSubscribers * planPrice;

    const marketPurchases = await MarketPurchaseModel.findAll({
      where: { status: 'completed' }
    });

    const totalMarketRevenue = marketPurchases.reduce((acc, curr) => acc + parseFloat(curr.platformFee || (curr.amount * 0.4)), 0);
    const totalSellerPayoutsEarned = marketPurchases.reduce((acc, curr) => acc + parseFloat(curr.sellerEarnings || (curr.amount * 0.6)), 0);

    const pendingPayouts = await PayoutModel.count({ where: { status: 'pending' } });
    const processingPayouts = await PayoutModel.count({ where: { status: 'processing' } });

    res.json({
      totalUsers,
      totalSubscribers,
      totalRevenue,
      totalMarketRevenue,
      totalSellerPayouts: totalSellerPayoutsEarned,
      pendingPayoutRequests: pendingPayouts + processingPayouts
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
    const { name, price, features, paddleProductId, paddlePriceId } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ message: 'Please provide name and price' });
    }

    let stripeProductId = null;
    let stripePriceId = null;

    try {
      console.log('Syncing new plan with Stripe (Fallback):', { name, price });
      // 1. Create a new Product and Price in Stripe (Fallback)
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
      
      stripeProductId = stripeProduct.id;
      stripePriceId = stripePrice.id;
    } catch (stripeErr) {
      console.warn('Stripe sync failed, proceeding with Paddle only:', stripeErr.message);
    }

    // 2. Create the new Plan in DB
    const newPlan = await PlanModel.create({
      name,
      price,
      features: features || [],
      stripeProductId,
      stripePriceId,
      paddleProductId,
      paddlePriceId,
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

// @desc    Get All Market Products
// @route   GET /api/admin/market-products
// @access  Private/Admin
const getMarketProducts = async (req, res) => {
  try {
    const products = await MarketProductModel.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(products);
  } catch (error) {
    console.error('Get Market Products Error:', error);
    res.status(500).json({ message: 'Server Error fetching market products' });
  }
};

// @desc    Update Market Product Status
// @route   PUT /api/admin/market-products/:id/status
// @access  Private/Admin
const updateMarketProductStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'active', 'rejected', 'sold', 'hidden'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const product = await MarketProductModel.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    product.status = status;
    await product.save();
    
    res.json({ message: `Product status updated to ${status}`, product });
  } catch (error) {
    console.error('Update Product Status Error:', error);
    res.status(500).json({ message: 'Server Error updating product status' });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  getAllPlans,
  createPlan,
  togglePlanStatus,
  getMarketProducts,
  updateMarketProductStatus
};
