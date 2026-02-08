import crypto from 'crypto';
import db from './db.js';

const insertStmt = db.prepare(`
  INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_price_id, status,
    current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
  VALUES (@id, @user_id, @stripe_subscription_id, @stripe_price_id, @status,
    @current_period_start, @current_period_end, @cancel_at_period_end, @created_at, @updated_at)
`);

const findByUserIdStmt = db.prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
const findByStripeIdStmt = db.prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?');

const updateStatusStmt = db.prepare(`
  UPDATE subscriptions SET status = @status, current_period_start = @current_period_start,
    current_period_end = @current_period_end, cancel_at_period_end = @cancel_at_period_end,
    updated_at = datetime('now')
  WHERE stripe_subscription_id = @stripe_subscription_id
`);

const deleteByStripeIdStmt = db.prepare('DELETE FROM subscriptions WHERE stripe_subscription_id = ?');

export function createSubscription({ user_id, stripe_subscription_id, stripe_price_id, status, current_period_start, current_period_end }) {
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    user_id,
    stripe_subscription_id,
    stripe_price_id,
    status: status || 'active',
    current_period_start: current_period_start || null,
    current_period_end: current_period_end || null,
    cancel_at_period_end: 0,
    created_at: now,
    updated_at: now,
  };
  insertStmt.run(row);
  return row;
}

export function findByUserId(userId) {
  return findByUserIdStmt.get(userId) || null;
}

export function findByStripeId(stripeSubId) {
  return findByStripeIdStmt.get(stripeSubId) || null;
}

export function updateStatus(stripeSubId, { status, current_period_start, current_period_end, cancel_at_period_end }) {
  updateStatusStmt.run({
    stripe_subscription_id: stripeSubId,
    status,
    current_period_start: current_period_start || null,
    current_period_end: current_period_end || null,
    cancel_at_period_end: cancel_at_period_end ? 1 : 0,
  });
}

export function deleteByStripeId(stripeSubId) {
  deleteByStripeIdStmt.run(stripeSubId);
}
