const REFERENCE_INTEL_SYSTEM_PROMPT = `You are an Amazon FBA competitive research analyst.

Given BSR, review count, and last-month unit sales for a competitor product, write a concise Intel Note (1-2 sentences) on competitive positioning, demand signal, or market gap opportunity.

Rules:
- Use listing category and marketplace context when provided.
- Be specific to the metrics — reference BSR, reviews, or sales velocity where relevant.
- Keep it practical for an FBA seller researching this listing.
- Return valid JSON only with one field: competitorAnalysis.`;

const buildReferenceIntelPrompt = ({
  bsr,
  review,
  lastMonthSell,
  category,
  marketplace,
  title,
  productUrl,
}) => `Write an Intel Note for this Amazon reference product.

Listing context:
- Product title: ${title || 'Not provided'}
- Main category: ${category || 'Not provided'}
- Marketplace: ${marketplace || 'US'}
- Product URL: ${productUrl || 'Not provided'}

Reference metrics:
- BSR: ${bsr}
- Review count: ${review}
- Last month unit sales: ${lastMonthSell}

Return JSON:
{
  "competitorAnalysis": "string"
}`;

const normalizeReferenceIntel = (raw = {}) => ({
  competitorAnalysis: String(raw.competitorAnalysis || '').trim(),
});

module.exports = {
  REFERENCE_INTEL_SYSTEM_PROMPT,
  buildReferenceIntelPrompt,
  normalizeReferenceIntel,
};
