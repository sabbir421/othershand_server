const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const SellerModel = require('../models/SellerModel');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await UserModel.findOne({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role: req.body.role || 'user',
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    let user = await UserModel.findOne({ where: { email } });
    let isSeller = false;

    if (!user) {
      user = await SellerModel.findOne({ where: { email } });
      isSeller = true;
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    user.resetOtp = otp;
    user.resetOtpExpires = expires;
    await user.save();

    // Send Email
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #020617; color: #fff; padding: 40px; border-radius: 16px;">
        <h1 style="color: #818cf8; font-size: 24px; margin-bottom: 24px;">Password Reset Request</h1>
        <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">You have requested to reset your FBA Pilot password. Use the verification code below to complete the process. This code will expire in 3 minutes.</p>
        <div style="background: #0f172a; padding: 24px; border-radius: 12px; text-align: center; margin: 32px 0;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: #fff;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
      </div>
    `;

    await sendEmail(email, 'FBA Pilot - Password Reset', emailHtml);

    res.json({ message: 'Password reset OTP sent to email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process forgot password request' });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    let user = await UserModel.findOne({ where: { email } });
    let isSeller = false;

    if (!user) {
      user = await SellerModel.findOne({ where: { email } });
      isSeller = true;
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate OTP
    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Reset password
    if (isSeller) {
      // SellerModel hooks will hash it automatically on save if we set password
      user.password = newPassword;
    } else {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();

    res.json({ message: 'Password has been successfully reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword
};
