import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { setStripeCustomer } from '../models/users.js';
import { findByUserId } from '../models/subscriptions.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  semiannual: process.env.STRIPE_PRICE_SEMIANNUAL,
  annual: process.env.STRIPE_PRICE_ANNUAL,
};

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * POST /api/subscription/checkout
 * Creates a Stripe Checkout Session and returns the URL.
 */
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    const priceId = PRICE_MAP[plan];
    if (!priceId) {
      return res.status(400).json({ success: false, error: 'Invalid plan. Use: monthly, semiannual, annual' });
    }

    const user = req.user;

    // Create or reuse Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { betbrain_user_id: user.id },
      });
      customerId = customer.id;
      setStripeCustomer(user.id, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${CLIENT_URL}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/pricing`,
      metadata: { betbrain_user_id: user.id },
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('Checkout session error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/subscription/portal
 * Creates a Stripe Customer Portal session for managing subscriptions.
 */
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user.stripe_customer_id) {
      return res.status(400).json({ success: false, error: 'No active subscription' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${CLIENT_URL}/settings`,
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('Portal session error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create portal session' });
  }
});

/**
 * GET /api/subscription/status
 * Returns the user's current subscription status.
 */
router.get('/status', requireAuth, (req, res) => {
  const sub = findByUserId(req.user.id);
  res.json({
    success: true,
    data: sub
      ? {
          status: sub.status,
          priceId: sub.stripe_price_id,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: !!sub.cancel_at_period_end,
        }
      : null,
  });
});

export default router;
