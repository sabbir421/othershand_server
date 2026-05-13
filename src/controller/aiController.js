const OpenAI = require('openai');
const ValidationModel = require('../models/ValidationModel');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_api_key_to_prevent_startup_crash',
});

// @desc    Validate product idea with AI
// @route   POST /api/ai/validate
// @access  Private
const validateProduct = async (req, res) => {
  try {
    const { idea } = req.body;

    if (!idea) {
      return res.status(400).json({ message: 'Product idea is required' });
    }

    const prompt = `
      Analyze the following Amazon FBA product idea and provide a realistic assessment. 
      Product Idea: "${idea}"
      
      Return the response STRICTLY as a JSON object with the following keys:
      - "demandScore": (integer from 1 to 10)
      - "competitionScore": (integer from 1 to 10, where 10 is highest competition)
      - "riskLevel": (string, either "Low", "Medium", or "High")
      - "verdict": (string, either "GO" or "NO-GO")
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000
    });

    const aiResult = JSON.parse(response.choices[0].message.content);

    // Save the validation history to the database
    const validation = await ValidationModel.create({
      userId: req.user.id,
      inputIdea: idea,
      demandScore: aiResult.demandScore,
      competitionScore: aiResult.competitionScore,
      riskLevel: aiResult.riskLevel,
      verdict: aiResult.verdict
    });

    res.json(validation);
  } catch (error) {
    console.error('AI Validation Error:', error);
    res.status(500).json({ message: 'Error generating AI validation' });
  }
};

// @desc    Generate product listing with AI (Supports Vision)
// @route   POST /api/ai/generate-listing
// @access  Private
const generateListing = async (req, res) => {
  try {
    const { productDetails, imageUrls, isAdvanced, keywordContext } = req.body;

    if (!productDetails && (!imageUrls || imageUrls.length === 0)) {
      return res.status(400).json({ message: 'Product details or images are required' });
    }

    const advancedContext = isAdvanced ? `
      ADVANCED SEO CONTEXT:
      The following keyword density data was extracted from top competitors. 
      You MUST strategically weave these high-frequency phrases into the listing:
      ${JSON.stringify(keywordContext)}
    ` : '';

    const userContent = [
      { 
        type: 'text', 
                text: `You are an elite Amazon FBA Conversion & SEO Copywriter. 
               Generate a premium, high-converting Amazon listing that is meaningful, informative, and visually attractive.
               
               ${advancedContext}
               
               PRODUCT CORE DATA: "${productDetails || 'Analyze images for details'}"
               
               STRICT ARCHITECTURAL REQUIREMENTS:
               1. TITLE: Max 200 chars. Must be highly SEO-optimized with primary and secondary keywords, yet attractive to human buyers. Use "pipe" separators for readability.
               2. BULLET POINTS: Exactly 7 points. Each must start with a CAPITALIZED EMOTIONAL HOOK followed by an informative benefit. Make them meaningful and persuasive.
               3. DESCRIPTION: A compelling, attractive brand narrative. Use HTML (<p>, <strong>, <br/>) to ensure it looks premium on Amazon. Focus on solving user pain points.
               4. BACKEND KEYWORDS: Array of 15 unique, high-frequency search terms (Search Terms) for maximum indexing. Do NOT repeat words from the title.

               GOAL: Maximum SEO ranking + High emotional appeal.
               
               Return the response STRICTLY as a JSON object with:
               - "title": (String)
               - "bulletPoints": (Array of exactly 7 strings)
               - "description": (String, HTML formatted)
               - "keywords": (Array of 15 strings)`
      }
    ];

    if (imageUrls && imageUrls.length > 0) {
      imageUrls.forEach(url => {
        userContent.push({
          type: 'image_url',
          image_url: { url }
        });
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: userContent }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2500
    });

    const aiResult = JSON.parse(response.choices[0].message.content);
    res.json(aiResult);
  } catch (error) {
    console.error('AI Listing Generation Error:', error);
    res.status(500).json({ message: 'Error generating AI listing' });
  }
};

// @desc    Compare multiple products with AI
// @route   POST /api/ai/compare
// @access  Private
const compareProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length < 2) {
      return res.status(400).json({ message: 'Select at least 2 products for comparison' });
    }

    const productsData = products.map((p, idx) => `
      PRODUCT #${idx + 1}:
      Keyword: ${p.primaryKeyword}
      Category: ${p.category}
      BSR: ${p.bsr}
      Reviews: ${p.reviews}
      Retail Price: $${p.retailPrice}
      Net Profit (Sea): $${p.netProfitSea}
      Margin (Sea): ${p.marginSea}%
      Net Profit (Air): $${p.netProfitAir}
      Margin (Air): ${p.marginAir}%
    `).join('\n');

    const prompt = `
      You are an elite Amazon FBA Strategy Consultant.
      Compare the following product ideas and determine which one has the highest probability of a successful launch.
      
      DATA SET:
      ${productsData}
      
      STRICT REQUIREMENTS:
      1. ANALYZE: For each product, provide a short 1-2 sentence pros/cons.
      2. RECOMMENDATION: Explicitly state which Product # is the "Winner".
      3. RATIONALE: Provide a deep strategic reason for why the winner was chosen (consider profit, risk, and market entry barriers).
      4. STRATEGY: Give a 3-step action plan for the winning product.

      Return the response STRICTLY as a JSON object with:
      - "comparisons": (Array of strings, one for each product matching the index)
      - "winnerIndex": (Integer, index of the winning product from 0 to n-1)
      - "recommendation": (String, title of winning product)
      - "rationale": (String, detailed analysis)
      - "actionPlan": (Array of 3 strings)
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResult = JSON.parse(response.choices[0].message.content);
    res.json(aiResult);
  } catch (error) {
    console.error('AI Comparison Error:', error);
    res.status(500).json({ message: 'Error generating AI comparison' });
  }
};

module.exports = {
  validateProduct,
  generateListing,
  compareProducts
};
