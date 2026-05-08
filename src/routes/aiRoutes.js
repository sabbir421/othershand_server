const express = require('express');
const { validateProduct, generateListing, compareProducts } = require('../controller/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/validate', protect, validateProduct);
router.post('/generate-listing', protect, generateListing);
router.post('/compare', protect, compareProducts);

module.exports = router;
