const express = require('express');
const { getAdminStats, getAllUsers, getCurrentPlan, updatePlan } = require('../controller/adminController');
const { getAllRequests, fulfillRequest } = require('../controller/ProductRequestController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', protect, admin, getAdminStats);
router.get('/users', protect, admin, getAllUsers);
router.get('/plan', protect, admin, getCurrentPlan);
router.post('/plan', protect, admin, updatePlan);
router.get('/requests', protect, admin, getAllRequests);
router.put('/requests/:id/fulfill', protect, admin, fulfillRequest);

module.exports = router;
