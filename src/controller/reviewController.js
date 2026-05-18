const ReviewModel = require('../models/ReviewModel');
const MarketPurchaseModel = require('../models/MarketPurchaseModel');
const MarketProductModel = require('../models/MarketProductModel');
const SellerModel = require('../models/SellerModel');

exports.createReview = async (req, res) => {
  try {
    const { marketProductId, rating, comment } = req.body;
    const clientId = req.user.id;

    // Verify the client purchased this product
    const purchase = await MarketPurchaseModel.findOne({
      where: {
        clientId,
        marketProductId,
        status: 'completed'
      }
    });

    if (!purchase) {
      return res.status(403).json({ message: 'You can only review products you have successfully purchased.' });
    }

    // Get the seller ID
    const product = await MarketProductModel.findByPk(marketProductId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check if review already exists
    const existingReview = await ReviewModel.findOne({
      where: { clientId, marketProductId }
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product.' });
    }

    const review = await ReviewModel.create({
      clientId,
      sellerId: product.sellerId,
      marketProductId,
      rating,
      comment
    });

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getSellerReviews = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const reviews = await ReviewModel.findAll({
      where: { sellerId },
      order: [['createdAt', 'DESC']]
    });

    if (reviews.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        reviews: []
      });
    }

    const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = (totalRating / reviews.length).toFixed(1);

    // We intentionally do not return client contact info, just anonymized data
    const anonymizedReviews = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt
    }));

    res.json({
      averageRating: parseFloat(averageRating),
      totalReviews: reviews.length,
      reviews: anonymizedReviews
    });
  } catch (error) {
    console.error('Get seller reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
