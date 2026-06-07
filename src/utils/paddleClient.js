const { Paddle, Environment } = require('@paddle/paddle-node-sdk');

const getPaddleEnvironment = () => {
  const env = (process.env.PADDLE_ENV || '').toLowerCase();
  if (env === 'production' || env === 'live') return Environment.production;
  if (env === 'sandbox') return Environment.sandbox;

  const apiKey = process.env.PADDLE_API_KEY || '';
  if (apiKey.includes('_live_')) return Environment.production;
  return Environment.sandbox;
};

const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment: getPaddleEnvironment(),
});

module.exports = { paddle, getPaddleEnvironment };
