const express = require('express');
const { validateProduct, getAllValidations, deleteValidation, generateListing, compareProducts } = require('../controller/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/validate', protect, getAllValidations);
router.post('/validate', protect, validateProduct);
router.delete('/validate/:id', protect, deleteValidation);
router.post('/generate-listing', protect, generateListing);
router.post('/compare', protect, compareProducts);

module.exports = router;
