const MAX_REFERENCE_NODES = 5;

const OPPORTUNITY_LEVELS = [
  'Excellent Opportunity',
  'Good Opportunity',
  'Moderate Opportunity',
  'Challenging but Possible',
  'Not Recommended',
];

const OPPORTUNITY_SYSTEM_PROMPT =
  'You are a supportive Amazon FBA product research advisor for beginners. You identify opportunities, explain challenges constructively, and always provide actionable strategies to succeed. You never use fear-based language or dismiss products without offering a path forward.';

const toStringList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split('\n').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

const toChallengeList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return { type: 'Challenge', detail: item };
      return {
        type: item.type || item.label || 'Challenge',
        detail: item.detail || item.description || String(item),
      };
    });
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return toChallengeList(parsed);
    } catch {
      return value.split('\n').map((s) => ({ type: 'Challenge', detail: s.trim() })).filter((c) => c.detail);
    }
  }
  return [];
};

const normalizeBeginnerStrategy = (value) => {
  const empty = {
    suggestedPriceRange: '',
    targetCompetitorType: '',
    differentiationIdeas: [],
    launchStrategy: [],
  };
  if (!value) return empty;
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { ...empty, launchStrategy: [value] };
    }
  }
  return {
    suggestedPriceRange: parsed.suggestedPriceRange || parsed.priceRange || '',
    targetCompetitorType: parsed.targetCompetitorType || parsed.targetCompetitor || '',
    differentiationIdeas: toStringList(parsed.differentiationIdeas || parsed.differentiation),
    launchStrategy: toStringList(parsed.launchStrategy || parsed.launchPlan),
  };
};

const clampScore = (value, min = 0, max = 10) => {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num)));
};

const deriveOpportunityLevel = (score) => {
  if (score >= 80) return 'Excellent Opportunity';
  if (score >= 65) return 'Good Opportunity';
  if (score >= 50) return 'Moderate Opportunity';
  if (score >= 35) return 'Challenging but Possible';
  return 'Not Recommended';
};

const formatBeginnerStrategyText = (strategy) => {
  const lines = [];
  if (strategy.suggestedPriceRange) lines.push(`Price Range: ${strategy.suggestedPriceRange}`);
  if (strategy.targetCompetitorType) lines.push(`Target Competitors: ${strategy.targetCompetitorType}`);
  if (strategy.differentiationIdeas.length) {
    lines.push('Differentiation:');
    strategy.differentiationIdeas.forEach((idea, i) => lines.push(`${i + 1}. ${idea}`));
  }
  if (strategy.launchStrategy.length) {
    lines.push('Launch Strategy:');
    strategy.launchStrategy.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  return lines.join('\n');
};

const normalizeReferenceProducts = (referenceProducts) => {
  if (!Array.isArray(referenceProducts)) return [];
  if (referenceProducts.length > MAX_REFERENCE_NODES) {
    const error = new Error(`A maximum of ${MAX_REFERENCE_NODES} reference nodes is allowed.`);
    error.statusCode = 400;
    throw error;
  }
  return referenceProducts.slice(0, MAX_REFERENCE_NODES);
};

const buildOpportunityPrompt = ({
  marketplace,
  category,
  productKeyword,
  seasonal,
  trend,
  referenceProducts = [],
}) => `
  You are a supportive Amazon product research advisor helping beginner FBA sellers find viable opportunities.
  Your tone is balanced, encouraging, and action-oriented — never fear-based.

  PRODUCT CONTEXT:
  - Marketplace: ${marketplace || 'US'}
  - Category: ${category}
  - Target Keyword: ${productKeyword || 'Not provided'}
  - Seasonality: ${seasonal || 'no'}
  - Demand Trend: ${trend || 'up'}

  COMPETITOR BENCHMARK DATA:
  ${referenceProducts.map((p, i) => `
  Competitor ${i + 1}:
  - Price: $${p.retailPrice || 'N/A'}
  - Monthly Sales: ${p.monthlySales || 'N/A'} units
  - BSR: ${p.bsr || 'N/A'}
  - Reviews: ${p.review || 'N/A'}
  - Weight: ${p.weight || 'N/A'}
  - Dimensions: ${p.dimension || 'N/A'}
  `).join('\n')}

  SCORING MODEL (each component 1-10, higher = more favorable for a NEW seller):
  Score each factor honestly but fairly for beginners:
  - Demand (30% weight): Search demand, sales velocity, trend direction
  - Competition (20%): How open the market is — 10 = easy entry, 1 = dominated by giants
  - Profit Margin (20%): Room for healthy margins after Amazon fees and sourcing
  - Review Barrier (10%): How hard reviews are to accumulate — 10 = low barrier, 1 = entrenched leaders
  - Price Opportunity (10%): Room to position with differentiation, bundles, or value gaps
  - Logistics (5%): Weight/dimension favorability for FBA fees and shipping
  - Trend Stability (5%): Is demand stable or growing vs volatile/declining

  Calculate opportunityScore (0-100) using:
  (demand×3 + competition×2 + profitMargin×2 + reviewBarrier×1 + priceOpportunity×1 + logistics×0.5 + trendStability×0.5)

  Assign opportunityLevel based on opportunityScore:
  - 80-100: "Excellent Opportunity"
  - 65-79: "Good Opportunity"
  - 50-64: "Moderate Opportunity"
  - 35-49: "Challenging but Possible"
  - 0-34: "Not Recommended"

  RULES:
  - NEVER label something "High Risk" without explaining how to succeed anyway
  - NEVER discourage beginners without offering alternatives
  - Convert every challenge into an actionable opportunity
  - Focus on "how to win" not "why to avoid"
  - Even competitive markets must include a realistic entry strategy if viable
  - Frame challenges as obstacles to overcome, not reasons to quit

  Return JSON with this exact structure:
  {
    "opportunityScore": number,
    "opportunityLevel": "Excellent Opportunity" | "Good Opportunity" | "Moderate Opportunity" | "Challenging but Possible" | "Not Recommended",
    "componentScores": {
      "demand": number,
      "competition": number,
      "profitMargin": number,
      "reviewBarrier": number,
      "priceOpportunity": number,
      "logistics": number,
      "trendStability": number
    },
    "positiveSignals": ["3-5 specific positive market signals"],
    "challenges": [
      { "type": "Competition level" | "Review saturation" | "Pricing pressure" | "Logistics constraints", "detail": "specific challenge with context" }
    ],
    "beginnerStrategy": {
      "suggestedPriceRange": "e.g. $12.99-$16.99 based on mid-market positioning",
      "targetCompetitorType": "e.g. compete with newer sellers (under 200 reviews), not top brands",
      "differentiationIdeas": ["3-4 specific ideas: bundles, branding, packaging, listing optimization"],
      "launchStrategy": ["3-4 specific launch steps: PPC keywords, coupon strategy, niche targeting"]
    },
    "verdict": "2-3 sentence human-friendly verdict: is this viable and under what conditions?",
    "reasoning": "Executive summary (max 120 words): balanced analysis of why this works or what it takes to succeed",
    "suggestedPrice": number,
    "competitionLevel": "Low" | "Medium" | "High",
    "demandScore": number,
    "competitionScore": number,
    "profitabilityScore": number
  }
`;

const normalizeAiResult = (raw) => {
  const components = raw.componentScores || {};
  const demandScore = clampScore(raw.demandScore ?? components.demand);
  const competitionScore = clampScore(raw.competitionScore ?? components.competition);
  const profitabilityScore = clampScore(raw.profitabilityScore ?? components.profitMargin ?? components.profitability);
  const reviewBarrierScore = clampScore(raw.reviewBarrierScore ?? components.reviewBarrier);
  const priceOpportunityScore = clampScore(raw.priceOpportunityScore ?? components.priceOpportunity);
  const logisticsScore = clampScore(raw.logisticsScore ?? components.logistics);
  const trendStabilityScore = clampScore(raw.trendStabilityScore ?? components.trendStability);

  const weightedScore = Math.round(
    demandScore * 3 +
    competitionScore * 2 +
    profitabilityScore * 2 +
    reviewBarrierScore * 1 +
    priceOpportunityScore * 1 +
    logisticsScore * 0.5 +
    trendStabilityScore * 0.5
  );

  const opportunityScore = clampScore(raw.opportunityScore ?? weightedScore, 0, 100);

  const opportunityLevel = OPPORTUNITY_LEVELS.includes(raw.opportunityLevel)
    ? raw.opportunityLevel
    : deriveOpportunityLevel(opportunityScore);

  const positiveSignals = toStringList(raw.positiveSignals);
  const challenges = toChallengeList(raw.challenges);
  const beginnerStrategy = normalizeBeginnerStrategy(raw.beginnerStrategy);

  const verdict = String(raw.verdict || '').trim();
  const reasoning = String(raw.reasoning || '').trim();
  const howToWin = String(raw.howToWin || '').trim() || formatBeginnerStrategyText(beginnerStrategy);

  return {
    opportunityScore,
    opportunityLevel,
    demandScore,
    competitionScore,
    profitabilityScore,
    reviewBarrierScore,
    priceOpportunityScore,
    logisticsScore,
    trendStabilityScore,
    riskScore: clampScore(raw.riskScore ?? Math.max(1, 10 - Math.round(opportunityScore / 10))),
    suggestedPrice: raw.suggestedPrice ? Number(raw.suggestedPrice) : null,
    competitionLevel: String(raw.competitionLevel || 'Medium').trim(),
    riskLevel: String(raw.riskLevel || opportunityLevel).trim(),
    verdict,
    reasoning,
    howToWin,
    positiveSignals,
    challenges,
    beginnerStrategy,
  };
};

const hasAirShipping = (plan) => {
  const value = plan?.shippingAir;
  return value !== null && value !== undefined && value !== '';
};

const hasSeaShipping = (plan) => {
  const value = plan?.shippingSea;
  return value !== null && value !== undefined && value !== '';
};

const buildLaunchValidationPrompt = (plan) => {
  const airProvided = hasAirShipping(plan);
  const seaProvided = hasSeaShipping(plan);

  const shippingLines = [];
  if (airProvided) {
    shippingLines.push(
      `- Shipping (Air): $${plan.shippingAir}`,
      `- Landing Cost (Air): $${plan.landingCostAir ?? 'N/A'}`,
      `- Net Profit per Unit (Air): $${plan.netProfitAir ?? 'N/A'}`,
      `- Profit Margin (Air): ${plan.marginAir ?? 'N/A'}%`,
    );
  }
  if (seaProvided) {
    shippingLines.push(
      `- Shipping (Sea): $${plan.shippingSea}`,
      `- Landing Cost (Sea): $${plan.landingCostSea ?? 'N/A'}`,
      `- Net Profit per Unit (Sea): $${plan.netProfitSea ?? 'N/A'}`,
      `- Profit Margin (Sea): ${plan.marginSea ?? 'N/A'}%`,
    );
  }

  const shippingFocus =
    airProvided && seaProvided
      ? 'Compare air vs sea viability and recommend the stronger shipping option.'
      : airProvided
        ? 'Analyze ONLY the air shipping path provided. Do not discuss sea shipping.'
        : seaProvided
          ? 'Analyze ONLY the sea shipping path provided. Do not discuss air shipping.'
          : 'No shipping cost was provided — focus on unit economics without a shipping method comparison.';

  return `
  You are a supportive Amazon FBA launch advisor helping beginners validate real launch plans.
  Your tone is balanced, encouraging, and action-oriented — never fear-based.

  LAUNCH PLAN DATA (from Launch Validator):

  PRODUCT & MARKET:
  - Primary Keyword: ${plan.primaryKeyword || 'N/A'}
  - Category: ${plan.category || 'N/A'}
  - Sub-Category: ${plan.subCategory || 'N/A'}
  - BSR: ${plan.bsr ?? 'N/A'}
  - Review Count: ${plan.reviews ?? 'N/A'}
  - Product Age on Market: ${plan.age || 'N/A'}
  - Weight: ${plan.weight || 'N/A'}
  - Dimensions: ${plan.dimension || 'N/A'}

  FULL COST BREAKDOWN:
  - Factory/Unit Cost: $${plan.costPerUnit ?? 'N/A'}
  - Packaging Cost: $${plan.customBag ?? 'N/A'}
  - Planned Order Quantity: ${plan.unitCount ?? 'N/A'} units
  ${shippingLines.join('\n  ')}

  PRICING & FEES:
  - Retail Price: $${plan.retailPrice ?? 'N/A'}
  - Amazon FBA Fee: $${plan.amazonFeeFba ?? 'N/A'}
  - TACOS (Ad Spend %): ${plan.tacosPercent ?? 25}%

  SHIPPING ANALYSIS NOTE:
  - ${shippingFocus}

  ANALYSIS FOCUS:
  1. Cost Structure: Are landed costs competitive for the shipping method(s) provided?
  2. Market Demand: Based on BSR and reviews, is demand strong enough?
  3. Market Condition: How competitive is this niche for a new seller?
  4. Profit Margin: Are margins healthy enough to sustain ads and growth?
  5. Launch Viability: Can a beginner realistically succeed with these numbers?

  SCORING MODEL (each component 1-10, higher = more favorable for a NEW seller):
  - Demand (30%): BSR, review velocity signals, category demand
  - Competition (20%): How open the market is for new entry
  - Profit Margin (20%): Use the provided margin for the shipping method(s) entered
  - Review Barrier (10%): Difficulty accumulating reviews vs competitors
  - Price Opportunity (10%): Room to position or optimize retail price
  - Logistics (5%): Weight/dimension and shipping cost favorability
  - Trend Stability (5%): Market stability based on product age and niche

  Calculate opportunityScore (0-100):
  (demand×3 + competition×2 + profitMargin×2 + reviewBarrier×1 + priceOpportunity×1 + logistics×0.5 + trendStability×0.5)

  Assign opportunityLevel:
  - 80-100: "Excellent Opportunity"
  - 65-79: "Good Opportunity"
  - 50-64: "Moderate Opportunity"
  - 35-49: "Challenging but Possible"
  - 0-34: "Not Recommended"

  RULES:
  - Use the ACTUAL cost and margin numbers provided — do not ignore them
  - Only reference air margins if air shipping was provided; only reference sea margins if sea shipping was provided
  - NEVER label "High Risk" without a path to succeed
  - Always provide actionable launch guidance for beginners
  - Convert challenges into opportunities

  Return JSON with this exact structure:
  {
    "opportunityScore": number,
    "opportunityLevel": "Excellent Opportunity" | "Good Opportunity" | "Moderate Opportunity" | "Challenging but Possible" | "Not Recommended",
    "componentScores": {
      "demand": number,
      "competition": number,
      "profitMargin": number,
      "reviewBarrier": number,
      "priceOpportunity": number,
      "logistics": number,
      "trendStability": number
    },
    "positiveSignals": ["3-5 signals based on costs, demand, and margins"],
    "challenges": [
      { "type": "Competition level" | "Review saturation" | "Pricing pressure" | "Logistics constraints" | "Cost structure", "detail": "specific detail" }
    ],
    "beginnerStrategy": {
      "suggestedPriceRange": "based on current retail price and margin headroom",
      "targetCompetitorType": "who to compete against",
      "differentiationIdeas": ["3-4 ideas"],
      "launchStrategy": ["3-4 steps including shipping choice if both provided, PPC, coupons"]
    },
    "verdict": "2-3 sentence verdict on launch viability",
    "reasoning": "Executive summary max 120 words referencing actual costs and margins",
    "suggestedPrice": number,
    "competitionLevel": "Low" | "Medium" | "High",
    "demandScore": number,
    "competitionScore": number,
    "profitabilityScore": number
  }
`;
};

const buildLaunchSnapshot = (plan) => ({
  primaryKeyword: plan.primaryKeyword,
  category: plan.category,
  subCategory: plan.subCategory,
  bsr: plan.bsr,
  reviews: plan.reviews,
  weight: plan.weight,
  dimension: plan.dimension,
  unitCount: plan.unitCount,
  costPerUnit: plan.costPerUnit,
  customBag: plan.customBag,
  shippingAir: plan.shippingAir,
  shippingSea: plan.shippingSea,
  retailPrice: plan.retailPrice,
  amazonFeeFba: plan.amazonFeeFba,
  tacosPercent: plan.tacosPercent,
  landingCostAir: plan.landingCostAir,
  landingCostSea: plan.landingCostSea,
  netProfitAir: plan.netProfitAir,
  netProfitSea: plan.netProfitSea,
  marginAir: plan.marginAir,
  marginSea: plan.marginSea,
});

module.exports = {
  MAX_REFERENCE_NODES,
  OPPORTUNITY_SYSTEM_PROMPT,
  normalizeReferenceProducts,
  buildOpportunityPrompt,
  buildLaunchValidationPrompt,
  buildLaunchSnapshot,
  normalizeAiResult,
  normalizeBeginnerStrategy,
  toStringList,
  toChallengeList,
};
