const express = require('express');
const router = express.Router();
const sellerController = require('../controller/sellerController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', sellerController.register);
router.post('/login', sellerController.login);

// Protected routes
router.get('/requests', protect, sellerController.getAvailableRequests);
router.post('/confirm/:id', protect, sellerController.confirmRequest);
router.post('/fulfill', protect, sellerController.fulfillRequest);

module.exports = router;
