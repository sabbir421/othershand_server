const PLATFORM_FEE_RATE = 0.25;
const SELLER_EARNINGS_RATE = 0.75;

const calculatePlatformFee = (amount) =>
  (Number(amount) * PLATFORM_FEE_RATE).toFixed(2);

const calculateSellerEarnings = (amount) =>
  (Number(amount) * SELLER_EARNINGS_RATE).toFixed(2);

const fallbackPlatformFee = (amount) => Number(amount) * PLATFORM_FEE_RATE;

const fallbackSellerEarnings = (amount) => Number(amount) * SELLER_EARNINGS_RATE;

module.exports = {
  PLATFORM_FEE_RATE,
  SELLER_EARNINGS_RATE,
  PLATFORM_FEE_PERCENT: Math.round(PLATFORM_FEE_RATE * 100),
  SELLER_EARNINGS_PERCENT: Math.round(SELLER_EARNINGS_RATE * 100),
  calculatePlatformFee,
  calculateSellerEarnings,
  fallbackPlatformFee,
  fallbackSellerEarnings,
};
