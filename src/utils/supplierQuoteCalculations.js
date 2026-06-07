const parseNum = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const hasShippingValue = (value) => {
  const num = parseNum(value);
  return value !== '' && value != null && num > 0;
};

const calculateQuoteCosts = (data = {}) => {
  const quantity = Math.max(1, parseInt(data.quantity || data.moq || 0, 10) || 1);
  const unitPrice = parseNum(data.unitPrice);
  const packaging = parseNum(data.packagingPrice);
  const unitProductCost = unitPrice + packaging;
  const totalProductCost = unitProductCost * quantity;

  const calcShipping = (shippingValue, shippingType = 'total') => {
    if (!hasShippingValue(shippingValue)) return null;

    const raw = parseNum(shippingValue);
    const isPerUnit = shippingType === 'per_unit';
    const totalShipping = isPerUnit ? raw * quantity : raw;
    const perUnitShipping = isPerUnit ? raw : raw / quantity;
    const landingCost = unitProductCost + perUnitShipping;
    const totalWithShipping = totalProductCost + totalShipping;

    return {
      totalShipping,
      perUnitShipping,
      landingCost,
      totalWithShipping,
    };
  };

  const air = calcShipping(data.shippingAir, data.shippingAirType || 'total');
  const sea = calcShipping(data.shippingSea, data.shippingSeaType || 'total');

  return {
    quantity,
    unitProductCost,
    totalProductCost,
    air,
    sea,
    finalUnitPriceAir: air ? air.landingCost : null,
    finalUnitPriceSea: sea ? sea.landingCost : null,
  };
};

module.exports = { calculateQuoteCosts, hasShippingValue };
