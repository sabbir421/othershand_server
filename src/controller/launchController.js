const LaunchModel = require('../models/LaunchModel');

const parseIntegerField = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[,\s]/g, '');
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  return Number.isFinite(num) ? num : null;
};

const parseDecimalField = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[,\s]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
};

const sanitizeLaunchPlanData = (data) => {
  const sanitized = { ...data };

  ['bsr', 'reviews', 'unitCount'].forEach((field) => {
    sanitized[field] = parseIntegerField(sanitized[field]);
  });

  [
    'costPerUnit', 'customBag', 'shippingAir', 'shippingSea',
    'retailPrice', 'amazonFeeFba', 'tacosPercent',
  ].forEach((field) => {
    sanitized[field] = parseDecimalField(sanitized[field]);
  });

  return sanitized;
};

const calculateLaunchMetrics = (data) => {
  const cost = parseFloat(data.costPerUnit || 0);
  const bag = parseFloat(data.customBag || 0);
  const sAir = parseFloat(data.shippingAir || 0);
  const sSea = parseFloat(data.shippingSea || 0);
  const price = parseFloat(data.retailPrice || 0);
  const fbaFee = parseFloat(data.amazonFeeFba || 0);
  const tacosP = parseFloat(data.tacosPercent || 25) / 100;

  const landingAir = cost + bag + sAir;
  const landingSea = cost + bag + sSea;
  const tacosValue = price * tacosP;

  const profitAir = price - landingAir - fbaFee - tacosValue;
  const profitSea = price - landingSea - fbaFee - tacosValue;

  return {
    landingCostAir: landingAir,
    landingCostSea: landingSea,
    netProfitAir: profitAir,
    netProfitSea: profitSea,
    marginAir: price > 0 ? (profitAir / price) * 100 : 0,
    marginSea: price > 0 ? (profitSea / price) * 100 : 0,
  };
};

// @desc    Create new launch validation plan
// @route   POST /api/launch
// @access  Private
const createLaunchPlan = async (req, res) => {
  try {
    const data = sanitizeLaunchPlanData(req.body);
    const metrics = calculateLaunchMetrics(data);

    const launchPlan = await LaunchModel.create({
      userId: req.user.id,
      ...data,
      ...metrics,
    });

    res.status(201).json(launchPlan);
  } catch (error) {
    console.error('Launch Plan Error:', error);
    res.status(500).json({ message: 'Server Error saving launch plan' });
  }
};

// @desc    Get all launch plans for user
// @route   GET /api/launch
// @access  Private
const getAllLaunchPlans = async (req, res) => {
  try {
    const plans = await LaunchModel.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(plans);
  } catch (error) {
    console.error('Get Launch Plans Error:', error);
    res.status(500).json({ message: 'Server Error fetching plans' });
  }
};

// @desc    Delete launch plan
// @route   DELETE /api/launch/:id
// @access  Private
const deleteLaunchPlan = async (req, res) => {
  try {
    const plan = await LaunchModel.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    await plan.destroy();
    res.json({ message: 'Launch plan removed' });
  } catch (error) {
    console.error('Delete Launch Plan Error:', error);
    res.status(500).json({ message: 'Server Error deleting plan' });
  }
};

// @desc    Update launch plan
// @route   PUT /api/launch/:id
// @access  Private
const updateLaunchPlan = async (req, res) => {
  try {
    const data = sanitizeLaunchPlanData(req.body);
    const metrics = calculateLaunchMetrics(data);

    const plan = await LaunchModel.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    await plan.update({
      ...data,
      ...metrics,
    });

    res.json(plan);
  } catch (error) {
    console.error('Update Launch Plan Error:', error);
    res.status(500).json({ message: 'Server Error updating plan' });
  }
};

module.exports = {
  createLaunchPlan,
  getAllLaunchPlans,
  deleteLaunchPlan,
  updateLaunchPlan
};
