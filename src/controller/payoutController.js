const Payout = require('../models/PayoutModel');
const Seller = require('../models/SellerModel');
const {
  getSellerFinancials,
  requestPayoutWithLedger,
  applyPayoutStatusChange,
} = require('../services/ledgerService');

exports.getSellerBalance = async (req, res) => {
  try {
    const financials = await getSellerFinancials(req.user.id);
    res.json(financials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.requestPayout = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { amount, country, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payout amount.' });
    }
    if (!country || !bankDetails) {
      return res.status(400).json({ message: 'Missing bank details.' });
    }

    const payout = await requestPayoutWithLedger({
      sellerId,
      amount,
      country,
      bankDetails,
    });

    res.status(201).json({ message: 'Payout requested successfully.', payout });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        message: error.message,
        available: error.available,
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.getSellerPayouts = async (req, res) => {
  try {
    const payouts = await Payout.findAll({
      where: { sellerId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllPayouts = async (req, res) => {
  try {
    const payouts = await Payout.findAll({
      order: [['createdAt', 'DESC']],
    });

    const enrichedPayouts = await Promise.all(
      payouts.map(async (p) => {
        const seller = await Seller.findByPk(p.sellerId);
        return {
          ...p.toJSON(),
          sellerName: seller
            ? `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'Unknown'
            : 'Unknown',
          sellerEmail: seller ? seller.email : 'Unknown',
        };
      })
    );

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
    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    if (!status) {
      if (adminNotes !== undefined) {
        payout.adminNotes = adminNotes;
        await payout.save();
      }
      return res.json({ message: 'Payout updated', payout });
    }

    const updatedPayout = await applyPayoutStatusChange(payout, status, adminNotes);
    res.json({ message: 'Payout updated', payout: updatedPayout });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};
