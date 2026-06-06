const ResearchModel = require('../models/ResearchModel');
const OpenAI = require('openai');
const {
  OPPORTUNITY_SYSTEM_PROMPT,
  normalizeReferenceProducts,
  buildOpportunityPrompt,
  normalizeAiResult,
} = require('../utils/opportunityAnalysis');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key',
});

// @desc    Analyze and save product research
// @route   POST /api/research
// @access  Private
const createResearch = async (req, res) => {
  try {
    const { category, productKeyword, price, bsr, reviews, weight, referenceProducts, marketplace, seasonal, trend } = req.body;

    const normalizedReferenceProducts = normalizeReferenceProducts(referenceProducts);

    const prompt = buildOpportunityPrompt({
      marketplace,
      category,
      productKeyword,
      seasonal,
      trend,
      referenceProducts: normalizedReferenceProducts,
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_RESPONSES_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: OPPORTUNITY_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });

    const aiResult = normalizeAiResult(JSON.parse(response.choices[0].message.content));

    let summaryBSR = bsr;
    let summaryLink = null;
    if (normalizedReferenceProducts.length > 0) {
      summaryBSR = normalizedReferenceProducts[0].bsr || bsr;
      summaryLink = normalizedReferenceProducts[0].productUrl || normalizedReferenceProducts[0].productLink;
    }

    const research = await ResearchModel.create({
      userId: req.user.id,
      category,
      productKeyword,
      price: aiResult.suggestedPrice || price,
      suggestedPrice: aiResult.suggestedPrice,
      bsr: summaryBSR || 0,
      referenceLink: summaryLink,
      reviews: reviews || 0,
      weight: weight || '',
      marketplace,
      seasonal,
      trend,
      referenceProducts: normalizedReferenceProducts,
      ...aiResult,
    });

    res.status(201).json(research);
  } catch (error) {
    console.error('Research Analysis Error:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server Error analyzing product' });
  }
};

// @desc    Get all research for logged in user
// @route   GET /api/research
// @access  Private
const getAllResearch = async (req, res) => {
  try {
    const research = await ResearchModel.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(research);
  } catch (error) {
    console.error('Get Research Error:', error);
    res.status(500).json({
      message: 'Server Error fetching research',
      error: error.message,
    });
  }
};

// @desc    Delete research
// @route   DELETE /api/research/:id
// @access  Private
const deleteResearch = async (req, res) => {
  try {
    const research = await ResearchModel.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!research) {
      return res.status(404).json({ message: 'Research not found' });
    }

    await research.destroy();
    res.json({ message: 'Research removed' });
  } catch (error) {
    console.error('Delete Research Error:', error);
    res.status(500).json({ message: 'Server Error deleting research' });
  }
};

module.exports = {
  createResearch,
  getAllResearch,
  deleteResearch,
};
