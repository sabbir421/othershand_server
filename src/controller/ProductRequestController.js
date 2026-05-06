const ProductRequestModel = require('../models/ProductRequestModel');
const ProductModel = require('../models/ProductModel');

// @desc    Submit a new product request
// @route   POST /api/requests
// @access  Private
const createRequest = async (req, res) => {
  try {
    const { minPrice, maxPrice, marketplace, category } = req.body;
    
    const request = await ProductRequestModel.create({
      userId: req.user.id,
      minPrice,
      maxPrice,
      marketplace,
      category
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Create Request Error:', error);
    res.status(500).json({ message: 'Server Error creating request' });
  }
};

// @desc    Get user's product requests
// @route   GET /api/requests
// @access  Private
const getUserRequests = async (req, res) => {
  try {
    const requests = await ProductRequestModel.findAll({
      where: { userId: req.user.id },
      include: [{ model: ProductModel, as: 'product' }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    console.error('Get User Requests Error:', error);
    res.status(500).json({ message: 'Server Error fetching requests' });
  }
};

// @desc    Get all product requests (Admin)
// @route   GET /api/admin/requests
// @access  Private/Admin
const getAllRequests = async (req, res) => {
  try {
    const requests = await ProductRequestModel.findAll({
      include: [{ model: ProductModel, as: 'product' }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    console.error('Get All Requests Error:', error);
    res.status(500).json({ message: 'Server Error fetching all requests' });
  }
};

// @desc    Fulfill a request with a product (Admin)
// @route   PUT /api/admin/requests/:id/fulfill
// @access  Private/Admin
const fulfillRequest = async (req, res) => {
  try {
    const { productId } = req.body;
    const request = await ProductRequestModel.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.productId = productId;
    request.status = 'fulfilled';
    await request.save();

    res.json(request);
  } catch (error) {
    console.error('Fulfill Request Error:', error);
    res.status(500).json({ message: 'Server Error fulfilling request' });
  }
};

module.exports = {
  createRequest,
  getUserRequests,
  getAllRequests,
  fulfillRequest
};
