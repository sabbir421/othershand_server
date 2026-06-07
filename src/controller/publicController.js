const PlanModel = require('../models/PlanModel');

// @desc    Get Current Active Plan for Public Pricing
// @route   GET /api/public/plans
// @access  Public
const getPublicPlans = async (req, res) => {
  try {
    const activePlans = await PlanModel.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'price', 'features', 'paddlePriceId', 'paddleProductId'],
      order: [['price', 'ASC']],
    });
    
    if (activePlans.length === 0) {
      return res.json([{ id: 0, name: 'Pro Strategy', price: 29.99, features: ["Neural Intelligence"] }]);
    }

    res.json(activePlans);
  } catch (error) {
    console.error('Public Plan Error:', error);
    res.status(500).json({ message: 'Error fetching plans' });
  }
};

module.exports = {
  getPublicPlans
};
