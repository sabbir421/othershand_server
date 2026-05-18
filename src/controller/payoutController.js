const Payout = require('../models/PayoutModel');
const MarketPurchase = require('../models/MarketPurchaseModel');
const MarketProduct = require('../models/MarketProductModel');
const Seller = require('../models/SellerModel');
const { Op } = require('sequelize');

// Utility to calculate seller balance
const calculateSellerFinancials = async (sellerId) => {
  // 1. Calculate Total Earned
  const products = await MarketProduct.findAll({ where: { sellerId } });
  const productIds = products.map(p => p.id);

  let totalEarned = 0;
  if (productIds.length > 0) {
    const sales = await MarketPurchase.findAll({
      where: { 
        marketProductId: productIds,
        status: 'completed'
      }
    });
    totalEarned = sales.reduce((acc, curr) => acc + parseFloat(curr.sellerEarnings || (curr.amount * 0.6)), 0);
  }

  // 2. Calculate Withdrawals
  const payouts = await Payout.findAll({ where: { sellerId } });
  
  const pendingWithdrawals = payouts
    .filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  const totalWithdrawn = payouts
    .filter(p => p.status === 'completed')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  const availableBalance = totalEarned - pendingWithdrawals - totalWithdrawn;

  return {
    totalEarned,
    pendingWithdrawals,
    totalWithdrawn,
    availableBalance: Math.max(0, availableBalance) // Prevent negative display
  };
};

exports.getSellerBalance = async (req, res) => {
  try {
    const financials = await calculateSellerFinancials(req.user.id);
    res.json(financials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.requestPayout = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { amount, country, bankDetails } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid payout amount.' });
    if (!country || !bankDetails) return res.status(400).json({ message: 'Missing bank details.' });

    const financials = await calculateSellerFinancials(sellerId);
    
    if (parseFloat(amount) > financials.availableBalance) {
      return res.status(400).json({ 
        message: 'Requested amount exceeds available balance.',
        available: financials.availableBalance
      });
    }

    const payout = await Payout.create({
      sellerId,
      amount,
      country,
      bankDetails,
      status: 'pending'
    });

    res.status(201).json({ message: 'Payout requested successfully.', payout });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSellerPayouts = async (req, res) => {
  try {
    const payouts = await Payout.findAll({
      where: { sellerId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllPayouts = async (req, res) => {
  try {
    const payouts = await Payout.findAll({
      order: [['createdAt', 'DESC']]
    });

    // Enrich with seller info if needed (manually since associations might not be defined globally)
    const enrichedPayouts = await Promise.all(payouts.map(async (p) => {
      const seller = await Seller.findByPk(p.sellerId);
      return {
        ...p.toJSON(),
        sellerName: seller ? `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
        sellerEmail: seller ? seller.email : 'Unknown'
      };
    }));

    res.json(enrichedPayouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const payout = await Payout.findByPk(id);
    if (!payout) return res.status(404).json({ message: 'Payout not found' });

    if (status) payout.status = status;
    if (adminNotes !== undefined) payout.adminNotes = adminNotes;
    
    if (status === 'completed' && !payout.completedAt) {
      payout.completedAt = new Date();
    }

    await payout.save();
    res.json({ message: 'Payout updated', payout });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
