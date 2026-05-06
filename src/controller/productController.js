const ProductModel = require('../models/ProductModel');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const products = await ProductModel.findAll();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await ProductModel.findByPk(req.params.id);

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const { 
      title, category, price, cost, profit, roi, 
      demandScore, competitionScore, supplierLinks,
      keywords, description, googleTrendsLink 
    } = req.body;

    // Handle image URLs from S3 upload
    let imageUrls = [];
    if (req.files) {
      imageUrls = req.files.map(file => file.location);
    }

    const product = await ProductModel.create({
      title,
      category,
      price,
      cost,
      profit,
      roi,
      demandScore,
      competitionScore,
      supplierLinks: typeof supplierLinks === 'string' ? JSON.parse(supplierLinks) : supplierLinks,
      images: imageUrls,
      keywords: typeof keywords === 'string' ? JSON.parse(keywords) : keywords,
      description,
      googleTrendsLink,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create Product Error:', error);
    res.status(500).json({ message: 'Server Error creating product' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
};
