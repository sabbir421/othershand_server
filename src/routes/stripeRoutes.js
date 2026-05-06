const express = require('express');
const { createCheckoutSession, webhook, createPortalSession } = require('../controller/stripeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/create-portal-session', protect, createPortalSession);

module.exports = router;
