const FbaCategory = require('../models/FbaCategory');
const FbaSizeTier = require('../models/FbaSizeTier');
const FbaStorageFee = require('../models/FbaStorageFee');

class FbaFeeService {
  /**
   * Calculates comprehensive FBA fees based on product characteristics.
   * @param {Object} params - The product data.
   * @param {number} params.price - Selling price.
   * @param {number} params.cogs - Cost of goods sold.
   * @param {number} params.weight - Weight in lbs.
   * @param {Object} params.dimensions - { l, w, h } in inches.
   * @param {string} params.categoryName - Category for referral fee.
   * @param {string} [params.marketplace='US'] - Marketplace code.
   */
  async calculateFees({ price, cogs, weight, dimensions, categoryName, marketplace = 'US' }) {
    const { l, w, h } = dimensions;
    
    // Standardize dimensions: longest, median, shortest
    const sortedDims = [parseFloat(l), parseFloat(w), parseFloat(h)].sort((a, b) => b - a);
    const longest = sortedDims[0];
    const median = sortedDims[1];
    const shortest = sortedDims[2];
    const inputWeight = parseFloat(weight);

    // 1. Determine Size Tier
    const tiers = await FbaSizeTier.findAll({ 
      where: { marketplace }, 
      order: [['maxLength', 'ASC'], ['maxWeight', 'ASC']] 
    });
    
    let selectedTier = null;
    for (const tier of tiers) {
      if (
        longest <= parseFloat(tier.maxLength) &&
        median <= parseFloat(tier.maxWidth) &&
        shortest <= parseFloat(tier.maxHeight) &&
        inputWeight <= parseFloat(tier.maxWeight)
      ) {
        selectedTier = tier;
        break;
      }
    }

    // Fallback to the largest available tier if no specific match
    if (!selectedTier && tiers.length > 0) {
      selectedTier = tiers[tiers.length - 1];
    } else if (!selectedTier) {
        throw new Error('No size tiers defined in database for this marketplace.');
    }

    // 2. Referral Fee Calculation
    const category = await FbaCategory.findOne({ where: { name: categoryName, marketplace } });
    const referralRate = category ? parseFloat(category.referralFeePercentage) / 100 : 0.15;
    let referralFee = price * referralRate;
    
    if (category && referralFee < parseFloat(category.minReferralFee)) {
      referralFee = parseFloat(category.minReferralFee);
    }

    // 3. Fulfillment Fee Calculation
    let fulfillmentFee = parseFloat(selectedTier.baseFee);
    if (parseFloat(selectedTier.perLbSurcharge) > 0 && inputWeight > parseFloat(selectedTier.surchargeThresholdWeight)) {
      const extraWeight = Math.ceil(inputWeight - parseFloat(selectedTier.surchargeThresholdWeight));
      fulfillmentFee += extraWeight * parseFloat(selectedTier.perLbSurcharge);
    }

    // 4. Monthly Storage Fee Calculation (Default to Jan-Sep rate)
    const storageRate = await FbaStorageFee.findOne({ where: { monthRange: 'Jan-Sep', marketplace } });
    const volumeCubicFt = (longest * median * shortest) / 1728;
    const monthlyStorageFee = volumeCubicFt * (storageRate ? parseFloat(storageRate.ratePerCubicFoot) : 0.78);

    // 5. Profit & Margin Summary
    const totalAmazonFees = referralFee + fulfillmentFee + monthlyStorageFee;
    const netProfit = price - cogs - totalAmazonFees;
    const netMargin = (netProfit / price) * 100;

    return {
      success: true,
      data: {
        price: parseFloat(price).toFixed(2),
        cogs: parseFloat(cogs).toFixed(2),
        sizeTier: selectedTier.name,
        dimensions: `${longest}" x ${median}" x ${shortest}"`,
        weight: `${inputWeight} lbs`,
        breakdown: {
          referralFee: referralFee.toFixed(2),
          fulfillmentFee: fulfillmentFee.toFixed(2),
          monthlyStorageFee: monthlyStorageFee.toFixed(2),
        },
        totalFees: totalAmazonFees.toFixed(2),
        netProfit: netProfit.toFixed(2),
        netMargin: netMargin.toFixed(2)
      }
    };
  }
}

module.exports = new FbaFeeService();
