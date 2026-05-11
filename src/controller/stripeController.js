const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_to_prevent_startup_crash');
const UserModel = require('../models/UserModel');
const PlanModel = require('../models/PlanModel');
const MarketPurchase = require('../models/MarketPurchaseModel');
const MarketProduct = require('../models/MarketProductModel');

// @desc    Create Stripe Checkout Session
// @route   POST /api/stripe/create-checkout-session
// @access  Private
const createCheckoutSession = async (req, res) => {
  try {
    const { planId } = req.body;
    const user = await UserModel.findByPk(req.user.id);
    
    // Find the specific plan or the first active one
    let targetPlan;
    if (planId) {
      targetPlan = await PlanModel.findByPk(planId);
    } else {
      targetPlan = await PlanModel.findOne({ where: { isActive: true }, order: [['price', 'ASC']] });
    }

    if (!targetPlan || !targetPlan.stripePriceId || !targetPlan.isActive) {
      return res.status(400).json({ message: 'Selected subscription plan is not available.' });
    }

    let customerId = user.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: targetPlan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      client_reference_id: user.id.toString(),
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

// @desc    Stripe Webhook Receiver
// @route   POST /api/stripe/webhook
// @access  Public
const webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Note: To verify the signature, we need the raw body. 
    // This requires express.raw({type: 'application/json'}) in the index.js just for this route.
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = session.client_reference_id;
        
        // Handle Subscription
        if (userId && !session.metadata?.type) {
          const user = await UserModel.findByPk(userId);
          if (user) {
            user.stripeSubscriptionId = session.subscription;
            user.subscriptionStatus = 'active';
            user.plan = 'pro';
            await user.save();
          }
        }

        // Handle Marketplace Purchase
        if (session.metadata?.type === 'market_purchase') {
          const { clientId, productId } = session.metadata;
          
          const purchase = await MarketPurchase.findOne({
            where: { clientId, marketProductId: productId, stripeSessionId: session.id }
          });

          if (purchase) {
            purchase.status = 'completed';
            await purchase.save();

            // Mark product as sold (optional: or keep as active if multiple people can buy)
            // For now, let's keep it active but log the sale
            console.log(`Marketplace Purchase Completed: Client ${clientId} bought Product ${productId}`);
          }
        }
        break;

      case 'invoice.payment_succeeded':
        // Continuing subscription
        const invoice = event.data.object;
        if (invoice.subscription) {
          await UserModel.update(
            { subscriptionStatus: 'active', plan: 'pro' },
            { where: { stripeSubscriptionId: invoice.subscription } }
          );
        }
        break;

      case 'invoice.payment_failed':
      case 'customer.subscription.deleted':
      case 'customer.subscription.canceled':
        const failedSub = event.data.object;
        const subId = failedSub.subscription || failedSub.id;
        if (subId) {
          await UserModel.update(
            { subscriptionStatus: 'canceled', plan: 'free' },
            { where: { stripeSubscriptionId: subId } }
          );
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).send('Webhook handler error');
  }
};

// @desc    Create Customer Portal Session
// @route   POST /api/stripe/create-portal-session
// @access  Private
const createPortalSession = async (req, res) => {
  try {
    const user = await UserModel.findByPk(req.user.id);
    
    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: 'No Stripe customer ID found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

module.exports = {
  createCheckoutSession,
  webhook,
  createPortalSession
};
