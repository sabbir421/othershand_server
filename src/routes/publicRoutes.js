const express = require('express');
const { getPublicPlans } = require('../controller/publicController');

const router = express.Router();

router.get('/plans', getPublicPlans);

module.exports = router;
