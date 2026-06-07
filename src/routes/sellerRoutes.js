const express = require('express');
const router = express.Router();
const sellerController = require('../controller/sellerController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', sellerController.register);
router.post('/verify-otp', sellerController.verifyRegisterOtp);
router.post('/resend-otp', sellerController.resendVerificationOtp);
router.post('/login', sellerController.login);

// Protected routes
router.get('/requests', protect, sellerController.getAvailableRequests);
router.post('/confirm/:id', protect, sellerController.confirmRequest);
router.post('/fulfill', protect, sellerController.fulfillRequest);

router.get('/profile', protect, sellerController.getProfile);
router.put('/profile', protect, sellerController.updateProfile);
router.put('/update-password', protect, sellerController.updatePassword);

module.exports = router;
