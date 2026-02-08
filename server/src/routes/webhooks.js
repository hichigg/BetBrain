import { Router } from 'express';
import Stripe from 'stripe';
import { findByStripeCustomerId, updateTier } from '../models/users.js';
import {
  createSubscription,
  findByStripeId,
  updateStatus,
  deleteByStripeId,
} from '../models/subscriptions.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe's verified webhook IP ranges
// https://docs.stripe.com/ips#webhook-ip-addresses
const STRIPE_WEBHOOK_IPS = [
  '3.18.12.63',
  '3.130.192.231',
  '13.235.14.237',
  '13.235.122.149',
  '18.211.135.69',
  '35.154.171.200',
  '52.15.183.38',
  '54.88.130.119',
  '54.88.130.237',
  '54.187.174.169',
  '54.187.205.235',
  '54.187.216.72',
];

function getClientIp(req) {
  // Railway / reverse proxies set x-forwarded-for
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip;
}

/**
 * POST /api/webhooks/stripe
 * Receives Stripe webhook events (raw body, verified signature).
 * Validates source IP against Stripe's published webhook IPs.
 */
router.post('/', (req, res) => {
  // IP allowlist check (skip in development for local testing)
  if (process.env.NODE_ENV === 'production') {
    const clientIp = getClientIp(req);
    if (!STRIPE_WEBHOOK_IPS.includes(clientIp)) {
      console.warn(`Webhook rejected: untrusted IP ${clientIp}`);
      return res.status(403).send('Forbidden: untrusted source IP');
    }
  }
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          handleCheckoutCompleted(session);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        handleSubscriptionUpdated(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        handleSubscriptionDeleted(sub);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`);
        break;
      }
      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err.message);
  }

  res.json({ received: true });
});

function handleCheckoutCompleted(session) {
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const user = findByStripeCustomerId(customerId);

  if (!user) {
    console.error(`Checkout completed but no user found for Stripe customer ${customerId}`);
    return;
  }

  // Check if sub already exists (idempotency)
  if (!findByStripeId(subscriptionId)) {
    createSubscription({
      user_id: user.id,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: '', // Will be filled by subscription.updated event
      status: 'active',
    });
  }

  updateTier(user.id, 'subscriber');
  console.log(`User ${user.email} upgraded to subscriber via checkout`);
}

function handleSubscriptionUpdated(sub) {
  const customerId = sub.customer;
  const user = findByStripeCustomerId(customerId);
  if (!user) return;

  const priceId = sub.items?.data?.[0]?.price?.id || '';

  updateStatus(sub.id, {
    status: sub.status,
    current_period_start: sub.current_period_start
      ? new Date(sub.current_period_start * 1000).toISOString()
      : null,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  });

  // If sub record doesn't exist yet, create it
  if (!findByStripeId(sub.id)) {
    createSubscription({
      user_id: user.id,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      status: sub.status,
      current_period_start: sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    });
  }

  // Downgrade if subscription is no longer active
  if (sub.status !== 'active' && sub.status !== 'trialing') {
    updateTier(user.id, 'free');
    console.log(`User ${user.email} downgraded — subscription status: ${sub.status}`);
  } else {
    updateTier(user.id, 'subscriber');
  }
}

function handleSubscriptionDeleted(sub) {
  const customerId = sub.customer;
  const user = findByStripeCustomerId(customerId);
  if (!user) return;

  deleteByStripeId(sub.id);
  updateTier(user.id, 'free');
  console.log(`User ${user.email} subscription deleted, downgraded to free`);
}

export default router;
