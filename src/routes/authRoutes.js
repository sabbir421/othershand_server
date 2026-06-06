const express = require('express');
const { 
  registerUser, 
  loginUser, 
  forgotPassword, 
  resetPassword,
  verifyRegisterOtp,
  resendVerificationOtp 
} = require('../controller/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-otp', verifyRegisterOtp);
router.post('/resend-otp', resendVerificationOtp);

module.exports = router;
