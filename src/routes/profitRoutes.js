const express = require('express');
const { calculateProfit } = require('../controller/profitController');

const router = express.Router();

router.post('/calculate', calculateProfit);

module.exports = router;
