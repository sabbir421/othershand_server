const fbaFeeService = require('../services/fbaFeeService');

// @desc    Calculate product profitability
// @route   POST /api/profit/calculate
// @access  Public
const calculateProfit = (req, res) => {
  try {
    const { cost, sellingPrice, shippingCost, amazonFees, adSpend } = req.body;

    if (!cost || !sellingPrice || !shippingCost || !amazonFees) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Basic calculation: Profit = Revenue - (Cost + Shipping + Amazon Fees + Ads)
    const totalCosts = parseFloat(cost) + parseFloat(shippingCost) + parseFloat(amazonFees) + (parseFloat(adSpend) || 0);
    const profit = parseFloat(sellingPrice) - totalCosts;
    const margin = (profit / parseFloat(sellingPrice)) * 100;
    const roi = (profit / totalCosts) * 100;

    res.json({
      profit: parseFloat(profit.toFixed(2)),
      margin: parseFloat(margin.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      totalCosts: parseFloat(totalCosts.toFixed(2))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Advanced FBA Fee calculation (Rule-based)
// @route   POST /api/profit/calculate-fba
// @access  Public
const calculateDetailedFbaFees = async (req, res) => {
  try {
    const { price, cogs, weight, dimensions, category, marketplace } = req.body;

    if (!price || !cogs || !weight || !dimensions || !category) {
      return res.status(400).json({ message: 'Missing required parameters for FBA calculation' });
    }

    const result = await fbaFeeService.calculateFees({
      price,
      cogs,
      weight,
      dimensions,
      categoryName: category,
      marketplace: marketplace || 'US'
    });

    res.json(result);
  } catch (error) {
    console.error('FBA Calculation Error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

module.exports = {
  calculateProfit,
  calculateDetailedFbaFees
};
