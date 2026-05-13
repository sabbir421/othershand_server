const { Paddle, Environment } = require('@paddle/paddle-node-sdk');
const UserModel = require('../models/UserModel');
const PlanModel = require('../models/PlanModel');

const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment: Environment.sandbox, // Change to Environment.production for live
});

// @desc    Paddle Webhook Receiver
// @route   POST /api/paddle/webhook
// @access  Public
const webhook = async (req, res) => {
  const signature = req.headers['paddle-signature'] || '';
  const rawBody = req.body ? req.body.toString() : ''; 
  const secret = process.env.PADDLE_WEBHOOK_SECRET || '';

  console.log('--- Webhook Received ---');
  console.log('Signature Header:', !!signature);
  console.log('Raw Body Length:', rawBody.length);

  try {
    if (!signature || !secret || !rawBody) {
      console.error('Paddle Webhook Error: Missing signature, secret, or body');
      return res.status(400).send('Invalid request');
    }

    let event;
    try {
      // The Paddle SDK unmarshal can throw if signature is invalid
      event = paddle.webhooks.unmarshal(rawBody, secret, signature);
    } catch (verifyError) {
      console.error('Paddle Signature Verification Failed:', verifyError.message);
      return res.status(401).send('Signature verification failed');
    }

    if (event) {
      const eventType = event.eventType || event.event_type;
      console.log('Paddle Event Type:', eventType);

      switch (eventType) {
        case 'subscription.created':
        case 'subscription.updated':
        case 'subscription.activated':
          const sub = event.data;
          const userId = sub.customData?.userId;
          if (userId) {
            const status = sub.status === 'active' ? 'active' : sub.status;
            await UserModel.update(
              { 
                paddleSubscriptionId: sub.id, 
                paddleCustomerId: sub.customerId,
                subscriptionStatus: status,
                plan: 'pro' 
              },
              { where: { id: userId } }
            );
          }
          break;

        case 'subscription.canceled':
          const canceledSub = event.data;
          await UserModel.update(
            { subscriptionStatus: 'canceled', plan: 'free' },
            { where: { paddleSubscriptionId: canceledSub.id } }
          );
          break;

        case 'transaction.completed':
          const transaction = event.data;
          // Handle Marketplace Purchase
          if (transaction.customData?.type === 'market_purchase') {
            const { productId, userId } = transaction.customData;
            
            // Finalize the purchase in our database
            const MarketPurchase = require('../models/MarketPurchaseModel');
            await MarketPurchase.update(
              { status: 'completed', paddleTransactionId: transaction.id },
              { where: { clientId: userId, marketProductId: productId, status: 'pending' } }
            );
            
            console.log(`Marketplace Purchase Completed: User ${userId} bought Product ${productId}`);
          }
          break;

        default:
          console.log(`Unhandled Paddle event type: ${event.eventType}`);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Paddle Webhook Error:', err);
    res.status(500).send('Webhook handler error');
  }
};

module.exports = {
  webhook
};
