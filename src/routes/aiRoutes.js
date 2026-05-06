const express = require('express');
const { validateProduct, generateListing } = require('../controller/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/validate', protect, validateProduct);
router.post('/generate-listing', protect, generateListing);

module.exports = router;
