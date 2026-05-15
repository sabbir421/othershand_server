const ResearchModel = require('../models/ResearchModel');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key',
});

// @desc    Analyze and save product research
// @route   POST /api/research
// @access  Private
const createResearch = async (req, res) => {
  try {
    const { category, productKeyword, price, bsr, reviews, weight, referenceProducts, marketplace, seasonal, trend } = req.body;

    const prompt = `
      As a Senior Amazon Market Strategist and E-commerce Consultant, perform a DEEP-DIVE market analysis for a new product launch.
      
      TARGET PROTOCOL:
      - Marketplace: ${marketplace || 'Global/General'}
      - Category: ${category}
      - Target Keyword: ${productKeyword || 'Not provided'}
      - Seasonality: ${seasonal || 'no'}
      - Momentum/Trend: ${trend || 'up'}

      COMPETITOR BENCHMARK MATRIX (LIVE NODES):
      ${(referenceProducts || []).map((p, i) => `
      Node ${i + 1}:
      - Price: $${p.retailPrice || 'N/A'}
      - Monthly Velocity: ${p.monthlySales || 'N/A'} units
      - BSR: ${p.bsr || 'N/A'}
      - Review Social Proof: ${p.review || 'N/A'} reviews
      - SKU Weight: ${p.weight || 'N/A'}
      `).join('\n')}

      PERFORM THE FOLLOWING CRITICAL ANALYSES:
      1. PRICE SATURATION AUDIT: Analyze the price spread of benchmarks. Is the market "stuck" in a race to the bottom? Identify if there is a "Premium Gap" or a "Value Gap" based on competitor pricing clusters.
      2. COMPETITOR MOAT AUDIT: Evaluate the "Social Proof Barrier" (review counts). If benchmarks have 1000+ reviews, how can a new entry compete? Factor in the ${trend} momentum.
      3. DEMAND FORECASTING: Based on the monthly sales of the reference nodes and the ${trend} trend, is the demand sustainable or declining?
      4. BARRIER TO ENTRY: Determine how difficult it is to rank on Page 1 for "${productKeyword}".

      OUTPUT REQUIREMENTS:
      - Demand Score (1-10): Be brutal. High demand with high competition = lower net demand score.
      - Competition Score (1-10): 10 means impossible to enter; 1 means wide open.
      - Profitability Score (1-10): Based on price saturation.
      - Opportunity Score (0-100): Weighted calculation.
      - Suggested Retail Price: The "Sweet Spot" price to penetrate the current matrix.
      
      - Reasoning (EXECUTIVE SUMMARY): 
        - Must include a "Saturation Index" (Low/Medium/High).
        - Must include a "Moat Analysis" of the leaders.
        - Tone: Critical, Professional, "No-Nonsense".
        - Max 100 words.

      - Action Plan (TACTICAL BATTLE PLAN):
        - 3 "Boots on the Ground" strategies to steal market share from the current nodes.

      Format the output as JSON:
      {
        "demandScore": number,
        "competitionScore": number,
        "profitabilityScore": number,
        "riskScore": number,
        "opportunityScore": number,
        "suggestedPrice": number,
        "competitionLevel": "string",
        "riskLevel": "string",
        "verdict": "string",
        "reasoning": "string",
        "howToWin": "string"
      }
    `;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_RESPONSES_MODEL || "gpt-4o", // Use GPT-4o for deep reasoning if possible
      messages: [{ role: "system", content: "You are an elite Amazon FBA consultant. You provide brutal, realistic, and highly data-driven market advice. You never use generic AI fluff." }, { role: "user", content: prompt }],
      temperature: 0.6,
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content);

    // Sanitize AI results
    const textFields = ['reasoning', 'howToWin', 'verdict', 'competitionLevel', 'riskLevel'];
    textFields.forEach(field => {
      if (aiResult[field]) {
        if (Array.isArray(aiResult[field])) aiResult[field] = aiResult[field].join('\n');
        else aiResult[field] = String(aiResult[field]);
      }
    });

    // Extract summary data from the first reference product
    let summaryBSR = bsr;
    let summaryLink = null;
    if (referenceProducts && referenceProducts.length > 0) {
      summaryBSR = referenceProducts[0].bsr || bsr;
      summaryLink = referenceProducts[0].productUrl || referenceProducts[0].productLink;
    }

    const research = await ResearchModel.create({
      userId: req.user.id,
      category,
      productKeyword,
      price: aiResult.suggestedPrice || price,
      suggestedPrice: aiResult.suggestedPrice,
      bsr: summaryBSR,
      referenceLink: summaryLink,
      reviews,
      weight,
      marketplace,
      seasonal,
      trend,
      referenceProducts,
      ...aiResult
    });

    res.status(201).json(research);
  } catch (error) {
    console.error('Research Analysis Error:', error);
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
      order: [['createdAt', 'DESC']]
    });
    res.json(research);
  } catch (error) {
    console.error('Get Research Error:', error);
    res.status(500).json({ 
      message: 'Server Error fetching research',
      error: error.message 
    });
  }
};

// @desc    Delete research
// @route   DELETE /api/research/:id
// @access  Private
const deleteResearch = async (req, res) => {
  try {
    const research = await ResearchModel.findOne({
      where: { id: req.params.id, userId: req.user.id }
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
  deleteResearch
};
