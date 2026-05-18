const express = require('express');
const router = express.Router();
const payoutController = require('../controller/payoutController');
const { protect, admin } = require('../middleware/authMiddleware');

// Seller routes
router.get('/balance', protect, payoutController.getSellerBalance);
router.post('/request', protect, payoutController.requestPayout);
router.get('/history', protect, payoutController.getSellerPayouts);

// Admin routes
router.get('/all', protect, admin, payoutController.getAllPayouts);
router.put('/:id/status', protect, admin, payoutController.updatePayoutStatus);

module.exports = router;
