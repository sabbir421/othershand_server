const { paddle } = require('../utils/paddleClient');
const UserModel = require('../models/UserModel');
const PlanModel = require('../models/PlanModel');

const isDev = process.env.NODE_ENV !== 'production';

// @desc    Paddle Webhook Receiver
// @route   POST /api/paddle/webhook
// @access  Public
const webhook = async (req, res) => {
  const signature = req.headers['paddle-signature'] || '';
  const rawBody = req.body ? req.body.toString() : ''; 
  const secret = process.env.PADDLE_WEBHOOK_SECRET || '';

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
      if (isDev) {
        console.log('Paddle webhook:', eventType);
      }

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

            // Send subscription welcome/activation email
            if (eventType === 'subscription.created' || eventType === 'subscription.activated') {
              try {
                const user = await UserModel.findByPk(userId);
                if (user && user.email) {
                  const sendEmail = require('../utils/sendEmail');
                  const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #020617; color: #fff; padding: 40px; border-radius: 16px;">
                      <h1 style="color: #10b981; font-size: 24px; margin-bottom: 24px; font-weight: bold;">Subscription Activated!</h1>
                      <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">Hello ${user.name || 'there'},</p>
                      <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">Thank you for subscribing to FBA Pilot! Your Pro subscription has been successfully activated. You now have full, unlimited access to all of our supplier research, list generation, and validation tools.</p>
                      <div style="background: #0f172a; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #1e293b;">
                        <p style="margin: 0; color: #fff; font-size: 14px;"><strong>Product:</strong> FBA Pilot SaaS Pro</p>
                        <p style="margin: 8px 0 0 0; color: #fff; font-size: 14px;"><strong>Status:</strong> Active</p>
                        <p style="margin: 8px 0 0 0; color: #fff; font-size: 14px;"><strong>Subscription ID:</strong> ${sub.id}</p>
                      </div>
                      <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">Happy Sourcing,<br/>The FBA Pilot Team</p>
                    </div>
                  `;
                  await sendEmail(user.email, 'FBA Pilot - Subscription Activated', emailHtml);
                }
              } catch (emailErr) {
                console.error('Failed to send subscription confirmation email:', emailErr);
              }
            }
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
            const { finalizeMarketPurchase } = require('../services/ledgerService');

            const purchaseIdToFinalize = purchaseId
              ? parseInt(purchaseId, 10)
              : null;

            if (purchaseIdToFinalize) {
              await finalizeMarketPurchase({
                purchaseId: purchaseIdToFinalize,
                paddleTransactionId: transaction.id,
                paymentEventId: event.eventId || event.id || `paddle:${transaction.id}`,
                source: 'webhook',
              });
            } else {
              const MarketPurchase = require('../models/MarketPurchaseModel');
              const pendingPurchase = await MarketPurchase.findOne({
                where: {
                  clientId: userId,
                  marketProductId: productId,
                  status: 'pending',
                },
                order: [['createdAt', 'DESC']],
              });

              if (pendingPurchase) {
                await finalizeMarketPurchase({
                  purchaseId: pendingPurchase.id,
                  paddleTransactionId: transaction.id,
                  paymentEventId: event.eventId || event.id || `paddle:${transaction.id}`,
                  source: 'webhook',
                });
              }
            }

            if (isDev) {
              console.log(`Marketplace purchase completed: ${purchaseId || 'unknown'} for user ${userId}`);
            }

            // Send marketplace purchase confirmation email
            try {
              const user = await UserModel.findByPk(userId);
              if (user && user.email) {
                const sendEmail = require('../utils/sendEmail');
                const emailHtml = `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #020617; color: #fff; padding: 40px; border-radius: 16px;">
                    <h1 style="color: #818cf8; font-size: 24px; margin-bottom: 24px; font-weight: bold;">Purchase Successful!</h1>
                    <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">Hello ${user.name || 'there'},</p>
                    <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">Your payment for the marketplace item has been successfully completed. The requested resources are now unlocked and available in your FBA Pilot dashboard.</p>
                    <div style="background: #0f172a; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #1e293b;">
                      <p style="margin: 0; color: #fff; font-size: 14px;"><strong>Transaction ID:</strong> ${transaction.id}</p>
                      <p style="margin: 8px 0 0 0; color: #fff; font-size: 14px;"><strong>Product Type:</strong> Marketplace Resource</p>
                      <p style="margin: 8px 0 0 0; color: #fff; font-size: 14px;"><strong>Status:</strong> Completed & Unlocked</p>
                    </div>
                    <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">Best regards,<br/>The FBA Pilot Team</p>
                  </div>
                `;
                await sendEmail(user.email, 'FBA Pilot - Marketplace Purchase Successful', emailHtml);
              }
            } catch (emailErr) {
              console.error('Failed to send marketplace purchase confirmation email:', emailErr);
            }
          }
          break;

        default:
          if (isDev) {
            console.log(`Unhandled Paddle event: ${eventType}`);
          }
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
