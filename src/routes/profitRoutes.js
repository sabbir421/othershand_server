const express = require('express');
const { calculateProfit, calculateDetailedFbaFees } = require('../controller/profitController');

const router = express.Router();

router.post('/calculate', calculateProfit);
router.post('/calculate-fba', calculateDetailedFbaFees);

module.exports = router;
