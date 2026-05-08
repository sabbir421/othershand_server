const PlanModel = require('../models/PlanModel');

// @desc    Get Current Active Plan for Public Pricing
// @route   GET /api/public/plans
// @access  Public
const getPublicPlans = async (req, res) => {
  try {
    const activePlan = await PlanModel.findOne({ 
      where: { isActive: true },
      attributes: ['name', 'price'] // Don't expose stripe IDs to public
    });
    
    // Default fallback if no plan exists in DB
    const plan = activePlan || { name: 'Pro Plan', price: 29.99 };
    
    res.json(plan);
  } catch (error) {
    console.error('Public Plan Error:', error);
    res.status(500).json({ message: 'Error fetching plans' });
  }
};

module.exports = {
  getPublicPlans
};
