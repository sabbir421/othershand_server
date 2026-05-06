const express = require('express');
const { createRequest, getUserRequests } = require('../controller/ProductRequestController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, createRequest)
  .get(protect, getUserRequests);

module.exports = router;
