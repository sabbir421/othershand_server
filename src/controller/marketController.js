const OpenAI = require('openai');
const MarketProduct = require('../models/MarketProductModel');
const MarketPurchase = require('../models/MarketPurchaseModel');
const Seller = require('../models/SellerModel');
const { Op } = require('sequelize');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
const { paddle } = require('../utils/paddleClient');
const {
  BLUEPRINT_PREVIEW_SYSTEM_PROMPT,
  buildBlueprintPreviewPrompt,
  buildCompetitorSummary,
  normalizeBlueprintPreview,
} = require('../utils/blueprintPreviewAnalysis');
const {
  REFERENCE_INTEL_SYSTEM_PROMPT,
  buildReferenceIntelPrompt,
  normalizeReferenceIntel,
} = require('../utils/referenceIntelGeneration');
const {
  calculatePlatformFee,
  calculateSellerEarnings,
  fallbackPlatformFee,
  fallbackSellerEarnings,
} = require('../constants/sellerFees');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_api_key_to_prevent_startup_crash',
});

const parseJsonField = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
};

const computeMaxMonthlySales = (references = []) => {
  if (!references.length) return 0;
  return Math.max(...references.map((ref) => parseInt(ref.lastMonthSell, 10) || 0));
};

const computeMinBsr = (references = []) => {
  const values = references
    .map((ref) => parseInt(ref.bsr, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!values.length) return 0;
  return Math.min(...values);
};

const withComputedReferenceMetrics = (product) => {
  const json = typeof product.toJSON === 'function' ? product.toJSON() : { ...product };
  const references = parseJsonField(json.references, []);
  if (references.length) {
    json.monthlySalesEst = computeMaxMonthlySales(references);
    json.avgBsr = computeMinBsr(references);
  }
  return json;
};

const MAX_TOP_KEYWORDS = 20;
const MAX_SUPPLIER_LINKS = 5;
const MAX_BULLET_POINTS = 8;
const MAX_LISTING_TITLE_LENGTH = 200;
const MAX_BACKEND_KEYWORDS_LENGTH = 250;
const MAX_LISTING_DESCRIPTION_LENGTH = 5000;

const sanitizeTopKeywords = (keywords) => {
  if (!keywords) return [];
  const list = Array.isArray(keywords) ? keywords : [];
  return list
    .map((keyword) => String(keyword).trim())
    .filter(Boolean)
    .slice(0, MAX_TOP_KEYWORDS);
};

const sanitizeSupplierLinks = (links) => {
  if (!links) return [];
  const list = Array.isArray(links) ? links : [];
  return list
    .map((link) => String(link).trim())
    .filter(Boolean)
    .slice(0, MAX_SUPPLIER_LINKS);
};

const sanitizeBulletPoints = (points) => {
  if (!points) return [];
  const list = Array.isArray(points) ? points : [];
  return list
    .map((point) => String(point).trim())
    .filter(Boolean)
    .slice(0, MAX_BULLET_POINTS);
};

const sanitizeListingTitle = (value) => {
  if (!value) return '';
  return String(value).trim().slice(0, MAX_LISTING_TITLE_LENGTH);
};

const sanitizeBackendKeywords = (value) => {
  if (!value) return '';
  return String(value).trim().slice(0, MAX_BACKEND_KEYWORDS_LENGTH);
};

const sanitizeListingDescription = (value) => {
  if (!value) return '';
  return String(value).trim().slice(0, MAX_LISTING_DESCRIPTION_LENGTH);
};

const validateListingExtras = (topKeywords, supplierLinks, bulletPoints) => {
  if (topKeywords.length > MAX_TOP_KEYWORDS) {
    return `A maximum of ${MAX_TOP_KEYWORDS} top keywords is allowed.`;
  }
  if (supplierLinks.length > MAX_SUPPLIER_LINKS) {
    return `A maximum of ${MAX_SUPPLIER_LINKS} supplier links is allowed.`;
  }
  if (bulletPoints.length > MAX_BULLET_POINTS) {
    return `A maximum of ${MAX_BULLET_POINTS} bullet points is allowed.`;
  }
  const invalidLink = supplierLinks.find((link) => !/^https?:\/\//i.test(link));
  if (invalidLink) {
    return 'Supplier links must be valid URLs starting with http:// or https://';
  }
  return null;
};

const parseListingExtrasArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getExtrasAvailability = (productJson) => {
  const topKeywords = parseListingExtrasArray(productJson.topKeywords);
  const supplierLinks = parseListingExtrasArray(productJson.supplierLinks);
  const bulletPoints = parseListingExtrasArray(productJson.bulletPoints);

  return {
    topKeywordsCount: topKeywords.length,
    supplierLinksCount: supplierLinks.length,
    bulletPointsCount: bulletPoints.length,
    hasListingTitle: Boolean(String(productJson.listingTitle || '').trim()),
    hasBackendKeywords: Boolean(String(productJson.backendKeywords || '').trim()),
    hasListingDescription: Boolean(String(productJson.listingDescription || '').trim()),
  };
};

exports.createProduct = async (req, res) => {
  try {
    const {
      title, category, marketplace, price, references, avgRoi, vaultContents, expectedProfitMargin, seasonal, trend, blueprintPreview,
      topKeywords, supplierLinks, bulletPoints, listingTitle, backendKeywords, listingDescription,
    } = req.body;
    const sellerId = req.user.id;

    const sanitizedTopKeywords = sanitizeTopKeywords(topKeywords);
    const sanitizedSupplierLinks = sanitizeSupplierLinks(supplierLinks);
    const sanitizedBulletPoints = sanitizeBulletPoints(bulletPoints);
    const sanitizedListingTitle = sanitizeListingTitle(listingTitle);
    const sanitizedBackendKeywords = sanitizeBackendKeywords(backendKeywords);
    const sanitizedListingDescription = sanitizeListingDescription(listingDescription);
    const extrasError = validateListingExtras(sanitizedTopKeywords, sanitizedSupplierLinks, sanitizedBulletPoints);
    if (extrasError) {
      return res.status(400).json({ message: extrasError });
    }

    if (!references || references.length < 1) {
      return res.status(400).json({ message: 'A minimum of 1 product reference is required for validation.' });
    }
    if (references.length > 5) {
      return res.status(400).json({ message: 'A maximum of 5 product references is allowed.' });
    }
    const parsedBlueprintPreview = parseJsonField(blueprintPreview, null);
    if (!parsedBlueprintPreview?.marketSummary) {
      return res.status(400).json({ message: 'Blueprint Preview is required. Generate the preview report before submitting.' });
    }

    const product = await MarketProduct.create({
      sellerId,
      title,
      category,
      marketplace: marketplace || 'US',
      price,
      references,
      mainImage: references[0].image,
      avgBsr: computeMinBsr(references),
      monthlySalesEst: computeMaxMonthlySales(references),
      avgRoi: avgRoi || 0,
      vaultContents: vaultContents || [],
      expectedProfitMargin: expectedProfitMargin || 0,
      seasonal: seasonal || 'no',
      trend: trend || 'up',
      blueprintPreview: parsedBlueprintPreview,
      topKeywords: sanitizedTopKeywords,
      supplierLinks: sanitizedSupplierLinks,
      bulletPoints: sanitizedBulletPoints,
      listingTitle: sanitizedListingTitle || null,
      backendKeywords: sanitizedBackendKeywords || null,
      listingDescription: sanitizedListingDescription || null,
    });

    res.status(201).json({ message: 'Research data posted successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const anonymizeMarketplaceProduct = (product) => ({
  id: product.id,
  price: product.price,
  avgBsr: product.avgBsr,
  avgRoi: product.avgRoi,
  monthlySalesEst: product.monthlySalesEst,
  seasonal: product.seasonal || 'no',
  trend: product.trend || 'up',
  createdAt: product.createdAt,
  title: `CONFIDENTIAL BLUEPRINT #${product.id.toString().padStart(4, '0')}`,
  mainImage: 'REDACTED',
  category: product.category || 'Verified Asset',
  marketplace: product.marketplace || 'US',
});

exports.getFeaturedProducts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 12);
    const products = await MarketProduct.findAll({
      where: { status: 'active' },
      attributes: ['id', 'price', 'category', 'marketplace', 'avgBsr', 'avgRoi', 'monthlySalesEst', 'seasonal', 'trend', 'createdAt', 'references'],
      order: [['createdAt', 'DESC']],
      limit,
    });
    res.json(products.map((product) => anonymizeMarketplaceProduct(withComputedReferenceMetrics(product))));
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
      attributes: ['id', 'price', 'category', 'marketplace', 'avgBsr', 'avgRoi', 'monthlySalesEst', 'seasonal', 'trend', 'createdAt', 'references'],
      order: [['createdAt', 'DESC']]
    });
    const anonymizedProducts = products.map((product) => anonymizeMarketplaceProduct(withComputedReferenceMetrics(product)));
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
          productUrl: 'REDACTED',
          competitorAnalysis: ref.competitorAnalysis || '',
        };
      });

      // STRICT WHITELIST: Only include absolutely non-sensitive fields
      const safeRootData = {
        id: productJson.id,
        price: productJson.price,
        avgBsr: computeMinBsr(productJson.references || []),
        avgRoi: productJson.avgRoi,
        monthlySalesEst: computeMaxMonthlySales(productJson.references || []),
        expectedProfitMargin: productJson.expectedProfitMargin,
        seasonal: productJson.seasonal || 'no',
        trend: productJson.trend || 'up',
        category: productJson.category || 'Verified Asset',
        marketplace: productJson.marketplace || 'US',
        blueprintPreview: parseJsonField(productJson.blueprintPreview, null),
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
        category: productJson.category || 'Verified Asset',
        vaultContents: (productJson.vaultContents || []).map(() => 'Locked Asset Detail'),
        references: redactedReferences,
        topKeywords: [],
        supplierLinks: [],
        bulletPoints: [],
        listingTitle: '',
        backendKeywords: '',
        listingDescription: '',
        extrasAvailability: getExtrasAvailability(productJson),
        isLocked: true 
      });
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ ...withComputedReferenceMetrics(product), isLocked: false });
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
    
    res.json(products.map((product) => withComputedReferenceMetrics(product)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const { productId } = req.body;
    const clientId = req.user.id;

    const product = await MarketProduct.findByPk(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const paddleProductId = process.env.PADDLE_MARKETPLACE_PRODUCT_ID;
    if (!paddleProductId) {
      return res.status(500).json({ message: 'Paddle marketplace product is not configured.' });
    }

    const sellerEarnings = calculateSellerEarnings(product.price);
    const platformFee = calculatePlatformFee(product.price);

    const purchase = await MarketPurchase.create({
      clientId,
      marketProductId: productId,
      amount: product.price,
      sellerEarnings,
      platformFee,
      status: 'pending'
    });

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
    const { transaction_id, session_id } = req.body;
    const clientId = req.user.id;

    if (transaction_id) {
      let purchase = await MarketPurchase.findOne({
        where: { paddleTransactionId: transaction_id, clientId },
      });

      if (purchase?.status === 'completed') {
        return res.json({ success: true, productId: purchase.marketProductId });
      }

      try {
        const txn = await paddle.transactions.get(transaction_id);
        const paid = txn?.status === 'completed' || txn?.status === 'paid';

        if (paid) {
          if (!purchase) {
            purchase = await MarketPurchase.findOne({
              where: { paddleTransactionId: transaction_id },
            });
          }
          if (purchase && purchase.clientId === clientId) {
            if (purchase.status !== 'completed') {
              purchase.status = 'completed';
              await purchase.save();
            }
            return res.json({ success: true, productId: purchase.marketProductId });
          }
        }
      } catch (paddleErr) {
        if (purchase?.status === 'pending') {
          return res.status(202).json({
            success: false,
            message: 'Payment is processing. Please wait a moment and refresh.',
          });
        }
        throw paddleErr;
      }

      return res.status(400).json({ message: 'Payment not verified' });
    }

    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === 'paid') {
        const purchase = await MarketPurchase.findOne({
          where: { stripeSessionId: session_id, clientId },
        });

        if (purchase) {
          if (purchase.status !== 'completed') {
            purchase.status = 'completed';
            await purchase.save();
          }
          return res.json({ success: true, productId: purchase.marketProductId });
        }
      }
    }

    return res.status(400).json({ message: 'Transaction ID is required' });
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

    const totalEarnings = sales.reduce(
      (acc, curr) => acc + parseFloat(curr.sellerEarnings || fallbackSellerEarnings(curr.amount)),
      0
    );
    
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
      marketplace,
      price, 
      references, 
      avgRoi, 
      vaultContents, 
      expectedProfitMargin,
      seasonal,
      trend,
      blueprintPreview,
      topKeywords,
      supplierLinks,
      bulletPoints,
      listingTitle,
      backendKeywords,
      listingDescription,
    } = req.body;

    const sanitizedTopKeywords = topKeywords !== undefined
      ? sanitizeTopKeywords(topKeywords)
      : sanitizeTopKeywords(product.topKeywords);
    const sanitizedSupplierLinks = supplierLinks !== undefined
      ? sanitizeSupplierLinks(supplierLinks)
      : sanitizeSupplierLinks(product.supplierLinks);
    const sanitizedBulletPoints = bulletPoints !== undefined
      ? sanitizeBulletPoints(bulletPoints)
      : sanitizeBulletPoints(product.bulletPoints);
    const sanitizedListingTitle = listingTitle !== undefined
      ? sanitizeListingTitle(listingTitle)
      : sanitizeListingTitle(product.listingTitle);
    const sanitizedBackendKeywords = backendKeywords !== undefined
      ? sanitizeBackendKeywords(backendKeywords)
      : sanitizeBackendKeywords(product.backendKeywords);
    const sanitizedListingDescription = listingDescription !== undefined
      ? sanitizeListingDescription(listingDescription)
      : sanitizeListingDescription(product.listingDescription);
    const extrasError = validateListingExtras(sanitizedTopKeywords, sanitizedSupplierLinks, sanitizedBulletPoints);
    if (extrasError) {
      return res.status(400).json({ message: extrasError });
    }

    if (references && references.length > 5) {
      return res.status(400).json({ message: 'A maximum of 5 product references is allowed.' });
    }
    const nextBlueprintPreview = parseJsonField(
      blueprintPreview !== undefined ? blueprintPreview : product.blueprintPreview,
      null
    );
    if (!nextBlueprintPreview?.marketSummary) {
      return res.status(400).json({ message: 'Blueprint Preview is required. Generate the preview report before saving.' });
    }

    await product.update({
      title,
      category,
      marketplace: marketplace !== undefined ? marketplace : product.marketplace,
      price,
      references: references || product.references,
      mainImage: references && references.length > 0 ? references[0].image : product.mainImage,
      avgBsr: references ? computeMinBsr(references) : product.avgBsr,
      monthlySalesEst: references ? computeMaxMonthlySales(references) : product.monthlySalesEst,
      avgRoi: avgRoi !== undefined ? avgRoi : product.avgRoi,
      vaultContents: vaultContents !== undefined ? vaultContents : product.vaultContents,
      expectedProfitMargin: expectedProfitMargin !== undefined ? expectedProfitMargin : product.expectedProfitMargin,
      seasonal: seasonal !== undefined ? seasonal : product.seasonal,
      trend: trend !== undefined ? trend : product.trend,
      blueprintPreview: blueprintPreview !== undefined ? blueprintPreview : product.blueprintPreview,
      topKeywords: sanitizedTopKeywords,
      supplierLinks: sanitizedSupplierLinks,
      bulletPoints: sanitizedBulletPoints,
      listingTitle: sanitizedListingTitle || null,
      backendKeywords: sanitizedBackendKeywords || null,
      listingDescription: sanitizedListingDescription || null,
    });

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateReferenceIntel = async (req, res) => {
  try {
    const {
      bsr,
      review,
      lastMonthSell,
      category,
      marketplace,
      title,
      productUrl,
    } = req.body;

    if (!bsr || !review || lastMonthSell === undefined || lastMonthSell === '') {
      return res.status(400).json({
        message: 'BSR, review count, and last month unit sales are required to generate reference intel.',
      });
    }

    const prompt = buildReferenceIntelPrompt({
      bsr,
      review,
      lastMonthSell,
      category,
      marketplace,
      title,
      productUrl,
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_RESPONSES_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: REFERENCE_INTEL_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.55,
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const reference = normalizeReferenceIntel(parsed);

    res.json({ reference });
  } catch (error) {
    console.error('Reference Intel Error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate reference intel' });
  }
};

exports.generateBlueprintPreview = async (req, res) => {
  try {
    const {
      category,
      marketplace,
      price,
      avgRoi,
      expectedProfitMargin,
      seasonal,
      trend,
      references = [],
    } = req.body;

    if (!references.length) {
      return res.status(400).json({ message: 'At least one product reference is required to generate a preview.' });
    }
    if (references.length > 5) {
      return res.status(400).json({ message: 'A maximum of 5 product references is allowed.' });
    }

    const avgBsr = computeMinBsr(references);
    const monthlySalesEst = computeMaxMonthlySales(references);

    const prompt = buildBlueprintPreviewPrompt({
      price,
      avgRoi,
      avgBsr,
      monthlySalesEst,
      expectedProfitMargin,
      seasonal,
      trend,
      category,
      marketplace,
      referenceCount: references.length,
      competitorSummary: buildCompetitorSummary(references),
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_RESPONSES_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: BLUEPRINT_PREVIEW_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.65,
    });

    const blueprintPreview = normalizeBlueprintPreview(
      JSON.parse(response.choices[0].message.content),
      {
        avgRoi,
        expectedProfitMargin,
        referenceCount: references.length,
        seasonal,
        trend,
      }
    );

    res.json({ blueprintPreview });
  } catch (error) {
    console.error('Blueprint Preview Error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate blueprint preview' });
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
        sellerEarnings: sale.sellerEarnings || calculateSellerEarnings(sale.amount),
        platformFee: sale.platformFee || calculatePlatformFee(sale.amount),
        status: sale.status,
        createdAt: sale.createdAt,
        paddleTransactionId: sale.paddleTransactionId,
        stripeSessionId: sale.stripeSessionId,
        product: {
          id: product.id,
          title: product.title,
          category: product.category,
          mainImage: product.mainImage,
          marketplace: product.marketplace || 'US',
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
