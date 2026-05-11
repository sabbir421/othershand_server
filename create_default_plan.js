const PlanModel = require('./src/models/PlanModel');
require('dotenv').config();

async function createDefaultPlan() {
  try {
    const [plan, created] = await PlanModel.findOrCreate({
      where: { isActive: true },
      defaults: {
        name: 'Pro Strategy',
        price: 29.99,
        features: [
          "Unlimited Winning Product Blueprints",
          "Neural Market Validation Engine",
          "High-Precision ROI Calculator",
          "AI Vision Listing Architect",
          "Strategic Sourcing Command",
          "Quantum Encryption Security"
        ],
        stripeProductId: 'prod_default',
        stripePriceId: 'price_default',
        isActive: true
      }
    });
    if (created) {
      console.log('Default plan created.');
    } else {
      console.log('Active plan already exists:', plan.name);
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

createDefaultPlan();
