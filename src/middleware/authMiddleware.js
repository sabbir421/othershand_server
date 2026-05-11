const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const protect = async (req, res, next) => {
  let token;
  console.log('--- Auth Check ---');
  console.log('Headers:', req.headers);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Verifying Token:', token);
      const decoded = jwt.verify(token, 'doorap_fba_secret_2026');
      console.log('Decoded Token:', decoded);

      if (decoded.role === 'seller') {
        const Seller = require('../models/SellerModel');
        req.user = await Seller.findByPk(decoded.id, {
          attributes: { exclude: ['password'] }
        });
      } else {
        req.user = await UserModel.findByPk(decoded.id, {
          attributes: { exclude: ['password'] }
        });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'User not found, authorization denied' });
      }

      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };
