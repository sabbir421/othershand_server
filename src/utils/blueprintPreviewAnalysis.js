const BLUEPRINT_PREVIEW_SYSTEM_PROMPT = `You are an elite Amazon FBA opportunity analyst writing a PRE-PURCHASE "Blueprint Preview Report" designed to excite serious sellers and motivate them to unlock the full blueprint.

YOUR MISSION:
Create a report that feels optimistic, credible, and purchase-worthy. The reader should think: "This opportunity looks strong — I need the full blueprint to launch with confidence."

TONE & STYLE:
- Confident, upbeat, and opportunity-forward (professional — not cheesy hype).
- Lead with strengths: demand signals, margin potential, competitive gaps, and launch upside.
- Frame challenges as manageable "launch considerations" — never fear-monger.
- Use active, empowering language: "validated", "positioned", "room to win", "clear path", "strong signal".
- When metrics are solid (ROI, margin, BSR, references, upward trend), reflect that with higher opportunity scores and positive recommendations.

SCORING GUIDANCE:
- opportunityScore 75-92: strong metrics, clear upside, good reference depth.
- opportunityScore 58-74: viable opportunity with defined execution path.
- opportunityScore 45-57: moderate opportunity — still highlight what works.
- Prefer "Highly Recommended" or "Good Opportunity" when data supports it.
- Use "Moderate Risk Opportunity" only when metrics are mixed — still stay constructive.
- Avoid "High Competition Warning" unless competition is clearly overwhelming.

CONVERSION RULES:
- Do NOT reveal hidden data (supplier names, exact ASINs, full strategy playbooks).
- Do NOT fabricate guaranteed profits or false certainty.
- DO tease the value of the full blueprint: factory intel, listing playbook, keyword map, scaling steps.
- Every section should subtly build desire to purchase the complete research package.

Return STRICTLY valid JSON with this shape:
{
  "headline": "Punchy 6-12 word positive headline e.g. Strong Evergreen Niche With Clear Margin Upside",
  "marketSummary": "2-3 upbeat lines on demand health, buyer intent, and category momentum",
  "opportunityScore": 0-100 integer,
  "opportunityJustification": "One confident line on why this score is attractive",
  "aiInsights": ["positive strength-focused insight 1", "positive strength-focused insight 2", "positive strength-focused insight 3"],
  "competitorSnapshot": {
    "competitorCount": "e.g. 5 reference products analyzed",
    "marketPattern": "fragmented | dominated | balanced",
    "pricingInsight": "upbeat pricing/margin opportunity insight",
    "entryDifficulty": "low | medium | high"
  },
  "risks": ["manageable consideration framed constructively 1", "consideration 2", "consideration 3"],
  "profitOutlook": {
    "monthlyProfitPotential": "optimistic but honest profit upside narrative",
    "breakEvenPerspective": "encouraging break-even / payback perspective",
    "scalability": "upbeat scalability narrative"
  },
  "unlockHighlights": [
    "What full blueprint unlocks — e.g. verified supplier contacts",
    "What full blueprint unlocks — e.g. listing optimization playbook",
    "What full blueprint unlocks — e.g. competitor reverse-engineering map"
  ],
  "purchaseHook": "One compelling closing line that nudges the buyer to unlock the full blueprint now",
  "recommendation": {
    "label": "Highly Recommended | Good Opportunity | Moderate Risk Opportunity | High Competition Warning",
    "reasoning": "One confident, purchase-motivating reasoning line"
  },
  "sourcingBlueprint": {
    "title": "Sourcing Blueprint",
    "description": "Verified factory coordinates and negotiation guidelines included in the full package."
  }
}`;

const buildBlueprintPreviewPrompt = ({
  price,
  avgRoi,
  avgBsr,
  monthlySalesEst,
  expectedProfitMargin,
  seasonal,
  trend,
  category,
  marketplace,
  referenceCount,
  competitorSummary,
}) => `
Analyze this Amazon FBA blueprint listing and produce an exciting, purchase-motivating Blueprint Preview Report.

LISTING METRICS:
- Amazon Marketplace: ${marketplace || 'Not specified'}
- Category: ${category || 'Not specified'}
- License Price: $${price || 0}
- ROI: ${avgRoi || 0}%
- Average BSR: ${avgBsr || 'N/A'}
- Estimated Monthly Sales: ${monthlySalesEst || 0} units
- Profit Margin: ${expectedProfitMargin || 0}%
- Seasonality: ${seasonal === 'yes' ? 'Seasonal Product' : 'Non-Seasonal (Evergreen)'}
- Trend: ${trend === 'up' ? 'Upward' : trend === 'down' ? 'Downward' : 'Stable / Moderate'}

PARTIAL COMPETITOR SUMMARY (no images, no identities):
- Reference products analyzed: ${referenceCount || 0}
${competitorSummary || '- Limited competitor metrics provided'}

WRITING DIRECTIVE:
Write like a premium research teaser. Celebrate validated demand, margin potential, and competitive whitespace. Make the reader feel they are one step away from a winning launch — and that the full blueprint is the key to executing it.
`;

const buildCompetitorSummary = (references = []) => {
  if (!references.length) return '';

  return references
    .map((ref, idx) => {
      const parts = [
        `Ref ${idx + 1}: BSR #${ref.bsr || 'N/A'}`,
        `reviews ${ref.review || 0}`,
        `monthly sell ${ref.lastMonthSell || 0}`,
        `retail $${ref.retailPrice || 0}`,
        ref.category ? `sub-cat ${ref.category}` : null,
        ref.weight ? `weight ${ref.weight}` : null,
      ].filter(Boolean);
      return `- ${parts.join(', ')}`;
    })
    .join('\n');
};

const clampScore = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
};

const toStringList = (value, fallback = []) => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return [value];
  return fallback;
};

const scoreFloorFromMetrics = (metrics = {}) => {
  let floor = 48;
  const roi = Number(metrics.avgRoi) || 0;
  const margin = Number(metrics.expectedProfitMargin) || 0;
  const refs = Number(metrics.referenceCount) || 0;

  if (roi >= 60) floor += 6;
  if (roi >= 100) floor += 8;
  if (margin >= 20) floor += 5;
  if (margin >= 35) floor += 5;
  if (refs >= 3) floor += 4;
  if (refs >= 5) floor += 6;
  if (metrics.trend === 'up') floor += 5;
  if (metrics.seasonal === 'no') floor += 3;

  return Math.min(88, floor);
};

const scoreLabel = (score) => {
  if (score >= 80) return 'Strong Buy Signal';
  if (score >= 65) return 'Promising Opportunity';
  if (score >= 50) return 'Viable Launch Candidate';
  return 'Early-Stage Potential';
};

const normalizeBlueprintPreview = (raw = {}, metrics = {}) => {
  const opportunityScore = Math.max(
    clampScore(raw.opportunityScore),
    scoreFloorFromMetrics(metrics)
  );

  const recommendationLabel =
    opportunityScore >= 78
      ? 'Highly Recommended'
      : opportunityScore >= 62
        ? 'Good Opportunity'
        : raw.recommendation?.label || 'Good Opportunity';

  return {
    headline: raw.headline || 'Validated Market Opportunity With Launch Upside',
    marketSummary:
      raw.marketSummary ||
      'Demand signals look healthy for this category, with room to differentiate and capture margin through a disciplined FBA launch.',
    opportunityScore,
    opportunityLabel: scoreLabel(opportunityScore),
    opportunityJustification:
      raw.opportunityJustification ||
      'Strong combination of demand consistency, margin potential, and competitive positioning.',
    aiInsights: toStringList(raw.aiInsights, [
      'Category demand appears stable with clear buyer intent behind reference benchmarks.',
      'Margin structure supports a confident launch when paired with the full sourcing playbook.',
      'Competitive landscape leaves room for a differentiated listing to gain traction.',
    ]),
    competitorSnapshot: {
      competitorCount: raw.competitorSnapshot?.competitorCount || `${metrics.referenceCount || 'Multiple'} reference products analyzed`,
      marketPattern: raw.competitorSnapshot?.marketPattern || 'balanced',
      pricingInsight:
        raw.competitorSnapshot?.pricingInsight ||
        'Retail pricing clusters create a clear window for a value-forward or premium-positioned entry.',
      entryDifficulty: raw.competitorSnapshot?.entryDifficulty || 'medium',
    },
    risks: toStringList(raw.risks, [
      'Launch pacing and ad efficiency will shape early profitability — manageable with the full playbook.',
      'Differentiation will be key to standing out — strategy included in the complete blueprint.',
    ]),
    profitOutlook: {
      monthlyProfitPotential:
        raw.profitOutlook?.monthlyProfitPotential ||
        'Solid monthly upside potential when sourcing and conversion are executed with the full research package.',
      breakEvenPerspective:
        raw.profitOutlook?.breakEvenPerspective ||
        'Healthy path to payback for sellers who follow the verified launch sequence in the full blueprint.',
      scalability:
        raw.profitOutlook?.scalability ||
        'Strong scale potential once unit economics are validated in the first launch phase.',
    },
    unlockHighlights: toStringList(raw.unlockHighlights, [
      'Verified supplier contacts and negotiation framework',
      'Full competitor reverse-analysis and positioning angles',
      'Complete listing, keyword, and scaling execution playbook',
    ]),
    purchaseHook:
      raw.purchaseHook ||
      'Unlock the full blueprint to turn this validated opportunity into a confident, ready-to-launch FBA business.',
    recommendation: {
      label: recommendationLabel,
      reasoning:
        raw.recommendation?.reasoning ||
        'Metrics and market signals support moving forward — the full blueprint delivers the execution layer you need.',
    },
    sourcingBlueprint: {
      title: raw.sourcingBlueprint?.title || 'Sourcing Blueprint',
      description:
        raw.sourcingBlueprint?.description ||
        'Verified factory coordinates and negotiation guidelines included in the full package.',
    },
  };
};

module.exports = {
  BLUEPRINT_PREVIEW_SYSTEM_PROMPT,
  buildBlueprintPreviewPrompt,
  buildCompetitorSummary,
  normalizeBlueprintPreview,
  scoreLabel,
};
