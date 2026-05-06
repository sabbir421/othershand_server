const express = require('express');
const router = express.Router();
const marketController = require('../controller/marketController');
const { protect } = require('../middleware/authMiddleware');

// Marketplace Browsing (Public/Client)
router.get('/products', protect, marketController.getAllProducts);
router.get('/products/:id', protect, marketController.getProductDetails);
router.get('/purchased', protect, marketController.getPurchasedProducts);
router.post('/verify', protect, marketController.verifyPurchase);
router.post('/checkout', protect, marketController.createCheckoutSession);

// Seller Actions
router.put('/update/:id', protect, marketController.updateProduct);
router.post('/post', protect, marketController.createProduct);
router.get('/stats', protect, marketController.getSellerStats);
router.post('/click/:id', marketController.incrementView);
router.delete('/delete/:id', protect, marketController.deleteProduct);

module.exports = router;
