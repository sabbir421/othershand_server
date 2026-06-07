const Seller = require('../models/SellerModel');
const ProductRequest = require('../models/ProductRequestModel');
const Product = require('../models/ProductModel');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const JWT_SECRET = 'doorap_fba_secret_2026';

const createSellerToken = (sellerId) =>
  jwt.sign({ id: sellerId, role: 'seller' }, JWT_SECRET, { expiresIn: '7d' });

const buildVerificationEmailHtml = (otp, firstName) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #020617; color: #fff; padding: 40px; border-radius: 16px;">
    <h1 style="color: #10b981; font-size: 24px; margin-bottom: 24px; font-weight: bold;">Verify Your Seller Account</h1>
    <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">Hi ${firstName || 'there'}, welcome to FBA Pilot Seller! Use the verification code below to verify your email and activate your partner account. This code is valid for 10 minutes.</p>
    <div style="background: #0f172a; padding: 24px; border-radius: 12px; text-align: center; margin: 32px 0; border: 1px solid #1e293b;">
      <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: #fff;">${otp}</span>
    </div>
    <p style="color: #94a3b8; font-size: 14px;">If you did not create a seller account, please ignore this email.</p>
  </div>
`;

const sendSellerVerificationEmail = async (email, firstName, otp) => {
  await sendEmail(
    email,
    'FBA Pilot Seller - Verify Your Email',
    buildVerificationEmailHtml(otp, firstName)
  );
};

exports.register = async (req, res) => {
  try {
    const { firstName, email, password, country, phone, experienceYears } = req.body;

    const existingSeller = await Seller.findOne({ where: { email } });
    if (existingSeller) {
      if (!existingSeller.isVerified) {
        return res.status(400).json({
          message: 'Email already registered but not verified. Please verify your email or request a new code.',
          isVerified: false,
          email: existingSeller.email,
        });
      }
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const seller = await Seller.create({
      firstName,
      email,
      password,
      country,
      phone,
      experienceYears,
      isVerified: false,
      verificationOtp: otp,
      verificationOtpExpires: expires,
    });

    await sendSellerVerificationEmail(email, firstName, otp);

    res.status(201).json({
      message: 'Registration successful! Verification OTP sent to your email.',
      email: seller.email,
      isVerified: false,
    });
  } catch (error) {
    console.error('Seller register error:', error);
    if (error.message?.includes('SMTP')) {
      return res.status(503).json({ message: 'Could not send verification email. Please try again later.' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const seller = await Seller.findOne({ where: { email } });

    if (!seller) {
      return res.status(404).json({ message: 'Seller account not found' });
    }

    if (seller.isVerified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    if (seller.verificationOtp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (new Date() > new Date(seller.verificationOtpExpires)) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    seller.isVerified = true;
    seller.verificationOtp = null;
    seller.verificationOtpExpires = null;
    await seller.save();

    res.json({
      message: 'Email verified successfully! You are now logged in.',
      id: seller.id,
      name: seller.firstName,
      email: seller.email,
      token: createSellerToken(seller.id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const seller = await Seller.findOne({ where: { email } });

    if (!seller) {
      return res.status(404).json({ message: 'Seller account not found' });
    }

    if (seller.isVerified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    seller.verificationOtp = otp;
    seller.verificationOtpExpires = expires;
    await seller.save();

    await sendSellerVerificationEmail(email, seller.firstName, otp);

    res.json({ message: 'Verification code resent successfully.' });
  } catch (error) {
    console.error('Seller resend verification OTP error:', error);
    if (error.message?.includes('SMTP')) {
      return res.status(503).json({ message: 'Could not send verification email. Please try again later.' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const seller = await Seller.findOne({ where: { email } });

    if (!seller || !(await seller.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!seller.isVerified) {
      return res.status(400).json({
        message: 'Please verify your email first.',
        isVerified: false,
        email: seller.email,
      });
    }

    res.json({
      id: seller.id,
      name: seller.firstName,
      email: seller.email,
      token: createSellerToken(seller.id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAvailableRequests = async (req, res) => {
  try {
    // Show requests that are pending or confirmed by this seller
    const requests = await ProductRequest.findAll({
      where: {
        status: 'pending'
      },
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.confirmRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user.id;

    const request = await ProductRequest.findByPk(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    // In a real scenario, we might want to check if it's already taken
    request.sellerId = sellerId;
    // We keep status as pending but mark who is working on it, or create a new status 'confirmed'
    // For now, let's just mark the sellerId
    await request.save();

    res.json({ message: 'Request confirmed', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.fulfillRequest = async (req, res) => {
  try {
    const { requestId, productData } = req.body;
    const sellerId = req.user.id;

    const request = await ProductRequest.findByPk(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Create the product in the products table
    const product = await Product.create({
      ...productData,
      // link to seller or some other identifier if needed
    });

    // Update request
    request.productId = product.id;
    request.status = 'fulfilled';
    request.sellerId = sellerId;
    await request.save();

    res.json({ message: 'Product submitted successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'resetOtp', 'resetOtpExpires'] }
    });
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json(seller);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, country, phone, experienceYears } = req.body;
    const seller = await Seller.findByPk(req.user.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    if (firstName !== undefined && firstName !== '') seller.firstName = firstName;
    if (country !== undefined && country !== '') seller.country = country;
    if (experienceYears !== undefined) seller.experienceYears = experienceYears;

    await seller.save();
    
    // Return updated profile without sensitive data
    const updatedSeller = seller.toJSON();
    delete updatedSeller.password;
    delete updatedSeller.resetOtp;
    delete updatedSeller.resetOtpExpires;

    res.json({ message: 'Profile updated successfully', seller: updatedSeller });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const seller = await Seller.findByPk(req.user.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    // Verify current password
    if (!(await seller.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    // Set new password (the model hook will hash it)
    seller.password = newPassword;
    await seller.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
