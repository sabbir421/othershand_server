const PLATFORM_FEE_RATE = 0.25;
const SELLER_EARNINGS_RATE = 0.75;

/**
 * Penny-safe split: platform fee is rounded first, seller gets the remainder
 * so sellerEarnings + platformFee always equals gross exactly.
 */
const splitMarketplacePurchase = (amount) => {
  const gross = Number(parseFloat(amount || 0).toFixed(2));
  const platformFee = Number((Math.round(gross * PLATFORM_FEE_RATE * 100) / 100).toFixed(2));
  const sellerEarnings = Number((gross - platformFee).toFixed(2));
  return { gross, sellerEarnings, platformFee };
};

const calculatePlatformFee = (amount) =>
  splitMarketplacePurchase(amount).platformFee.toFixed(2);

const calculateSellerEarnings = (amount) =>
  splitMarketplacePurchase(amount).sellerEarnings.toFixed(2);

const fallbackPlatformFee = (amount) => splitMarketplacePurchase(amount).platformFee;

const fallbackSellerEarnings = (amount) => splitMarketplacePurchase(amount).sellerEarnings;

module.exports = {
  PLATFORM_FEE_RATE,
  SELLER_EARNINGS_RATE,
  PLATFORM_FEE_PERCENT: Math.round(PLATFORM_FEE_RATE * 100),
  SELLER_EARNINGS_PERCENT: Math.round(SELLER_EARNINGS_RATE * 100),
  splitMarketplacePurchase,
  calculatePlatformFee,
  calculateSellerEarnings,
  fallbackPlatformFee,
  fallbackSellerEarnings,
};
