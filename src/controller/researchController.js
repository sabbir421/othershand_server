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
    const { category, productKeyword, price, bsr, reviews, weight } = req.body;

    const prompt = `
      Analyze this Amazon product idea:
      Category: ${category}
      Product Keyword: ${productKeyword || 'Not provided'}
      Price: ${price}
      BSR: ${bsr}
      Reviews: ${reviews}
      Weight: ${weight}

      Instructions:
      1. Score these factors from 1–10 (Be highly realistic and critical):
         - Demand: How many people are actually buying this right now?
         - Competition: How many big brands or high-review sellers dominate?
         - Profitability: After Amazon fees, PPC, and shipping, what's left?
         - Risk: Is this a "get rich quick" trap? Is it fragile, seasonal, or patent-heavy?
      
      2. Calculate an overall Opportunity Score (0–100). Be conservative. High scores should be rare.

      3. Assign:
         - Competition Level: Low / Medium / High
         - Risk Level: Low / Medium / High

      4. Give a final verdict (e.g., ✅ STRONG BUY, ⚠️ PROCEED WITH CAUTION, ❌ AVOID).
      
      5. Reasoning:
         - Write like a seasoned e-commerce consultant speaking to a friend.
         - NO "AI fluff" (e.g., "This product presents a compelling opportunity").
         - Use "I" or "We" to feel human.
         - Reference the BSR, Reviews, and Price data directly and critically.
         - Max 80 words.

      6. "Action Plan":
         - 3 realistic, "boots on the ground" strategies to actually win.

      Format the output as JSON:
      {
        "demandScore": number,
        "competitionScore": number,
        "profitabilityScore": number,
        "riskScore": number,
        "opportunityScore": number,
        "competitionLevel": "string",
        "riskLevel": "string",
        "verdict": "string",
        "reasoning": "string",
        "howToWin": "string"
      }
    `;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_RESPONSES_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: parseFloat(process.env.OPENAI_RESPONSES_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.OPENAI_RESPONSES_MAX_OUTPUT_TOKENS) || 1000,
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content);

    // Sanitize AI results to ensure string fields don't receive objects/arrays
    const textFields = ['reasoning', 'howToWin', 'verdict', 'competitionLevel', 'riskLevel'];
    textFields.forEach(field => {
      if (aiResult[field]) {
        if (Array.isArray(aiResult[field])) {
          aiResult[field] = aiResult[field].join('\n');
        } else if (typeof aiResult[field] === 'object') {
          aiResult[field] = JSON.stringify(aiResult[field]);
        } else {
          aiResult[field] = String(aiResult[field]);
        }
      }
    });

    const research = await ResearchModel.create({
      userId: req.user.id,
      category,
      productKeyword,
      price,
      bsr,
      reviews,
      weight,
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
    res.status(500).json({ message: 'Server Error fetching research' });
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
