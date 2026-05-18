const MarketProduct = require('../models/MarketProductModel');
const MarketPurchase = require('../models/MarketPurchaseModel');
const Seller = require('../models/SellerModel');
const { Op } = require('sequelize');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

exports.createProduct = async (req, res) => {
  try {
    const { title, category, price, references, avgRoi, vaultContents, expectedProfitMargin } = req.body;
    const sellerId = req.user.id;

    if (!references || references.length < 1) {
      return res.status(400).json({ message: 'A minimum of 1 product reference is required for validation.' });
    }

    const product = await MarketProduct.create({
      sellerId,
      title,
      category,
      price,
      references,
      mainImage: references[0].image,
      avgBsr: Math.floor(references.reduce((acc, curr) => acc + (parseInt(curr.bsr) || 0), 0) / references.length),
      monthlySalesEst: Math.floor(references.reduce((acc, curr) => acc + (parseInt(curr.lastMonthSell) || 0), 0) / references.length),
      avgRoi: avgRoi || 0,
      vaultContents: vaultContents || [],
      expectedProfitMargin: expectedProfitMargin || 0
    });

    res.status(201).json({ message: 'Research data posted successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const clientId = req.user?.id;
    
    // Find all products the client has already purchased
    let purchasedProductIds = [];
    if (clientId) {
      const purchases = await MarketPurchase.findAll({
        where: { clientId, status: 'completed' },
        attributes: ['marketProductId']
      });
      purchasedProductIds = purchases.map(p => p.marketProductId);
    }

    // Filter out the purchased products
    const whereClause = { status: 'active' };
    if (purchasedProductIds.length > 0) {
      whereClause.id = { [Op.notIn]: purchasedProductIds };
    }

    // Clients see limited info before purchase
    const products = await MarketProduct.findAll({
      where: whereClause,
      attributes: ['id', 'title', 'category', 'price', 'avgBsr', 'avgRoi', 'monthlySalesEst', 'mainImage', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    const anonymizedProducts = products.map(p => ({
      ...p.toJSON(),
      title: `CONFIDENTIAL BLUEPRINT #${p.id.toString().padStart(4, '0')}`,
      mainImage: 'REDACTED',
      category: 'Verified Asset'
    }));
    res.json(anonymizedProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await MarketProduct.findByPk(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Hardened access check: explicitly check for seller (with role) or completed purchase
    const isSeller = req.user && req.user.role === 'seller' && product.sellerId && String(product.sellerId) === String(req.user.id);
    const purchase = await MarketPurchase.findOne({
      where: { 
        clientId: req.user.id, 
        marketProductId: id, 
        status: 'completed' 
      }
    });

    const forceLock = req.query.preview === 'true';

    if ((!purchase && !isSeller) || forceLock) {
      // Return info with REDACTED sensitive URLs
      const productJson = product.toJSON();
      // Safety parse JSON fields if they are strings
      if (typeof productJson.references === 'string') {
        try { productJson.references = JSON.parse(productJson.references); } catch (e) { productJson.references = []; }
      }
      if (typeof productJson.vaultContents === 'string') {
        try { productJson.vaultContents = JSON.parse(productJson.vaultContents); } catch (e) { productJson.vaultContents = []; }
      }

      const redactedReferences = (productJson.references || []).map(ref => {
        // STRICT ALLOW-LIST: Only send non-sensitive technical metrics
        return {
          review: ref.review || ref.reviews || ref.reviewCount || ref.lastMonthReview || '0',
          reviews: ref.review || ref.reviews || ref.reviewCount || ref.lastMonthReview || '0',
          weight: ref.weight || ref.productWeight || 'N/A',
          bsr: ref.bsr || 'N/A',
          lastMonthSell: ref.lastMonthSell || '0',
          retailPrice: ref.retailPrice || '0',
          category: ref.category || 'Verified Asset',
          image: 'REDACTED',
          googleTrend: 'REDACTED',
          competitorAnalysis: 'Intelligence Locked'
        };
      });

      // STRICT WHITELIST: Only include absolutely non-sensitive fields
      const safeRootData = {
        id: productJson.id,
        price: productJson.price,
        avgBsr: productJson.avgBsr,
        avgRoi: productJson.avgRoi,
        monthlySalesEst: productJson.monthlySalesEst,
        expectedProfitMargin: productJson.expectedProfitMargin,
        status: productJson.status,
        createdAt: productJson.createdAt,
        updatedAt: productJson.updatedAt,
        sellerId: productJson.sellerId
      };

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res.json({ 
        ...safeRootData, 
        title: `CONFIDENTIAL BLUEPRINT #${productJson.id.toString().padStart(4, '0')}`,
        mainImage: 'REDACTED',
        category: 'Verified Asset',
        vaultContents: (productJson.vaultContents || []).map(() => 'Locked Asset Detail'),
        references: redactedReferences,
        isLocked: true 
      });
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ ...product.toJSON(), isLocked: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPurchasedProducts = async (req, res) => {
  try {
    const clientId = req.user.id;
    const purchases = await MarketPurchase.findAll({
      where: { clientId, status: 'completed' }
    });
    
    const productIds = purchases.map(p => p.marketProductId);
    const products = await MarketProduct.findAll({
      where: { id: productIds }
    });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const { Paddle, Environment } = require('@paddle/paddle-node-sdk');
const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment: Environment.sandbox, // Change to Environment.production for live
});

exports.createCheckoutSession = async (req, res) => {
  try {
    const { productId } = req.body;
    const clientId = req.user.id;

    const product = await MarketProduct.findByPk(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const sellerEarnings = (product.price * 0.60).toFixed(2);
    const platformFee = (product.price * 0.40).toFixed(2);

    // 1. Create a pending record in our DB
    const purchase = await MarketPurchase.create({
      clientId,
      marketProductId: productId,
      amount: product.price,
      sellerEarnings,
      platformFee,
      status: 'pending'
    });

    // 2. Create a Transaction in Paddle with a CUSTOM price
    // We use a generic Product ID from env to act as the base
    const paddleProductId = process.env.PADDLE_MARKETPLACE_PRODUCT_ID || 'pro_01hr...';

    const transaction = await paddle.transactions.create({
      items: [
        {
          price: {
            description: `Research Data: ${product.title}`,
            productId: paddleProductId,
            unitPrice: {
              amount: Math.round(product.price * 100).toString(),
              currencyCode: 'USD'
            }
          },
          quantity: 1
        }
      ],
      customData: {
        userId: String(clientId),
        productId: String(productId),
        purchaseId: String(purchase.id),
        type: 'market_purchase'
      }
    });

    // 3. Store the transaction ID in our pending record
    purchase.paddleTransactionId = transaction.id;
    await purchase.save();

    res.json({ 
      transactionId: transaction.id,
      userId: clientId,
      productId: product.id
    });
  } catch (error) {
    console.error('Market Purchase Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPurchase = async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ message: 'Session ID is required' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      const purchase = await MarketPurchase.findOne({
        where: { stripeSessionId: session_id }
      });
      
      if (purchase) {
        if (purchase.status !== 'completed') {
          purchase.status = 'completed';
          await purchase.save();
        }
        return res.json({ success: true, productId: purchase.marketProductId });
      }
    }
    res.status(400).json({ message: 'Payment not verified' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSellerStats = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const products = await MarketProduct.findAll({ where: { sellerId } });
    const productIds = products.map(p => p.id);

    const sales = await MarketPurchase.findAll({
      where: { 
        marketProductId: productIds,
        status: 'completed'
      }
    });

    const totalEarnings = sales.reduce((acc, curr) => acc + parseFloat(curr.sellerEarnings || (curr.amount * 0.6)), 0);
    
    res.json({
      totalProducts: products.length,
      totalSales: sales.length,
      totalEarnings,
      products
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.incrementView = async (req, res) => {
  try {
    console.log('Incrementing view for product:', req.params.id);
    const product = await MarketProduct.findByPk(req.params.id);
    if (product) {
      product.viewCount = (product.viewCount || 0) + 1;
      await product.save();
      console.log('View count updated to:', product.viewCount);
      res.json({ message: 'View incremented', viewCount: product.viewCount });
    } else {
      console.log('Product not found for view increment:', req.params.id);
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error in incrementView:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await MarketProduct.findOne({
      where: { id: req.params.id, sellerId: req.user.id }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await MarketProduct.findOne({
      where: { id: req.params.id, sellerId: req.user.id }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    const { 
      title, 
      category, 
      price, 
      references, 
      avgRoi, 
      vaultContents, 
      expectedProfitMargin 
    } = req.body;

    await product.update({
      title,
      category,
      price,
      references: references || product.references,
      mainImage: references && references.length > 0 ? references[0].image : product.mainImage,
      avgBsr: references ? Math.floor(references.reduce((acc, curr) => acc + (parseInt(curr.bsr) || 0), 0) / references.length) : product.avgBsr,
      monthlySalesEst: references ? Math.floor(references.reduce((acc, curr) => acc + (parseInt(curr.lastMonthSell) || 0), 0) / references.length) : product.monthlySalesEst,
      avgRoi: avgRoi !== undefined ? avgRoi : product.avgRoi,
      vaultContents: vaultContents !== undefined ? vaultContents : product.vaultContents,
      expectedProfitMargin: expectedProfitMargin !== undefined ? expectedProfitMargin : product.expectedProfitMargin
    });

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSellerSalesHistory = async (req, res) => {
  try {
    const sellerId = req.user.id;
    // Get all products owned by this seller
    const products = await MarketProduct.findAll({ where: { sellerId } });
    if (!products.length) return res.json([]);
    
    // Map of product id to product object for fast lookup
    const productMap = {};
    products.forEach(p => {
      productMap[p.id] = p;
    });
    
    const productIds = Object.keys(productMap);

    // Get all completed purchases for these products
    const sales = await MarketPurchase.findAll({
      where: { 
        marketProductId: productIds,
        status: 'completed'
      },
      order: [['createdAt', 'DESC']]
    });

    // Enrich sales data with product details
    const enrichedSales = sales.map(sale => {
      const product = productMap[sale.marketProductId];
      return {
        id: sale.id,
        amount: sale.amount,
        sellerEarnings: sale.sellerEarnings || (sale.amount * 0.6).toFixed(2),
        platformFee: sale.platformFee || (sale.amount * 0.4).toFixed(2),
        status: sale.status,
        createdAt: sale.createdAt,
        paddleTransactionId: sale.paddleTransactionId,
        stripeSessionId: sale.stripeSessionId,
        product: {
          id: product.id,
          title: product.title,
          category: product.category,
          mainImage: product.mainImage
        },
        clientId: sale.clientId // Included for reference if needed
      };
    });

    res.json(enrichedSales);
  } catch (error) {
    console.error('getSellerSalesHistory Error:', error);
    res.status(500).json({ message: error.message });
  }
};
