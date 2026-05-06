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
        text: `You are a world-class Amazon FBA Copywriting Expert. 
               Generate an elite, high-converting, SEO-optimized Amazon listing.
               
               ${advancedContext}
               
               PRODUCT CORE DATA: "${productDetails || 'Analyze images for details'}"
               
               STRICT REQUIREMENTS:
               1. TITLE: Maximum 200 characters. SEO-rich, includes brand potential.
               2. BULLET POINTS: EXACTLY 7 benefit-driven, high-impact points.
               3. DESCRIPTION: Engaging narrative with HTML formatting (bold tags where appropriate).
               4. BACKEND KEYWORDS: Array of 15 high-relevance search terms.

               Return the response STRICTLY as a JSON object with:
               - "title": (String, max 200 chars)
               - "bulletPoints": (Array of exactly 7 strings)
               - "description": (String, HTML allowed)
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

module.exports = {
  validateProduct,
  generateListing,
};
