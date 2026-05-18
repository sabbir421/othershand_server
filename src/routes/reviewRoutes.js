const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const reviewController = require('../controller/reviewController');

// Post a review (Requires authentication as a user/client)
router.post('/', protect, reviewController.createReview);

// Get seller insights (Public, but can be protected if we want)
router.get('/seller/:sellerId', reviewController.getSellerReviews);

module.exports = router;
