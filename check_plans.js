const PlanModel = require('./src/models/PlanModel');
require('dotenv').config();

async function checkPlans() {
  try {
    const plans = await PlanModel.findAll();
    console.log(JSON.stringify(plans, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkPlans();
