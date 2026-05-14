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
      // The Paddle SDK unmarshal can be async depending on version, 
      // adding await ensures we catch verification failures correctly.
      event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
    } catch (verifyError) {
      console.error('Paddle Signature Verification Failed:', verifyError.message);
      return res.status(401).send('Signature verification failed');
    }

    if (event) {
      // Handle both SDK versions and raw structures
      const eventType = event.eventType || event.event_type || (event.data ? event.data.event_type : null);
      console.log('--- Paddle Event Decoded ---');
      console.log('Event Type:', eventType);
      console.log('Event Data Keys:', Object.keys(event.data || {}));

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
            const { productId, userId, purchaseId } = transaction.customData;
            
            // Finalize the EXACT purchase record using purchaseId
            const MarketPurchase = require('../models/MarketPurchaseModel');
            
            const updateCriteria = purchaseId 
              ? { id: purchaseId } 
              : { clientId: userId, marketProductId: productId, status: 'pending' };

            await MarketPurchase.update(
              { status: 'completed', paddleTransactionId: transaction.id },
              { where: updateCriteria }
            );
            
            console.log(`Marketplace Purchase Completed: Record ${purchaseId || 'unknown'} fulfilled for User ${userId}`);
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
