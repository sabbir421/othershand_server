const express = require('express');
const { getAdminStats, getAdminFinancials, getAllMarketSales, getAllUsers, getAllPlans, createPlan, togglePlanStatus, getMarketProducts, getMarketProductById, updateMarketProductStatus } = require('../controller/adminController');
const { getAllRequests, fulfillRequest } = require('../controller/ProductRequestController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', protect, admin, getAdminStats);
router.get('/financials', protect, admin, getAdminFinancials);
router.get('/market-sales', protect, admin, getAllMarketSales);
router.get('/users', protect, admin, getAllUsers);
router.get('/plans', protect, admin, getAllPlans);
router.post('/plans', protect, admin, createPlan);
router.put('/plans/:id/toggle', protect, admin, togglePlanStatus);
router.get('/requests', protect, admin, getAllRequests);
router.put('/requests/:id/fulfill', protect, admin, fulfillRequest);
router.get('/market-products', protect, admin, getMarketProducts);
router.get('/market-products/:id', protect, admin, getMarketProductById);
router.put('/market-products/:id/status', protect, admin, updateMarketProductStatus);

module.exports = router;
