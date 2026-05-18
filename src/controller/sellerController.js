const Seller = require('../models/SellerModel');
const ProductRequest = require('../models/ProductRequestModel');
const Product = require('../models/ProductModel');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { firstName, email, password, country, phone, experienceYears } = req.body;
    
    const existingSeller = await Seller.findOne({ where: { email } });
    if (existingSeller) return res.status(400).json({ message: 'Email already registered' });

    const seller = await Seller.create({
      firstName,
      email,
      password,
      country,
      phone,
      experienceYears
    });

    const token = jwt.sign({ id: seller.id, role: 'seller' }, 'doorap_fba_secret_2026', { expiresIn: '7d' });

    res.status(201).json({
      id: seller.id,
      name: seller.firstName,
      email: seller.email,
      token
    });
  } catch (error) {
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

    const token = jwt.sign({ id: seller.id, role: 'seller' }, 'doorap_fba_secret_2026', { expiresIn: '7d' });

    res.json({
      id: seller.id,
      name: seller.firstName,
      email: seller.email,
      token
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
