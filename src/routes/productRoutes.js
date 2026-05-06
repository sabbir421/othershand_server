const express = require('express');
const { getProducts, getProductById, createProduct } = require('../controller/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../utils/s3Upload');

const router = express.Router();

router.route('/')
  .get(getProducts)
  .post(protect, admin, upload.array('images', 5), createProduct);

router.route('/:id')
  .get(getProductById);

module.exports = router;
