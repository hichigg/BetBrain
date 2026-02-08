import crypto from 'crypto';
import db from './db.js';

const ADMIN_EMAIL = 'hichigg@gmail.com';

const findByGoogleIdStmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const findByStripeCustomerIdStmt = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?');

const insertStmt = db.prepare(`
  INSERT INTO users (id, google_id, email, name, picture, tier, created_at, updated_at)
  VALUES (@id, @google_id, @email, @name, @picture, @tier, @created_at, @updated_at)
`);

const updateTierStmt = db.prepare(`
  UPDATE users SET tier = @tier, updated_at = datetime('now') WHERE id = @id
`);

const setStripeCustomerStmt = db.prepare(`
  UPDATE users SET stripe_customer_id = @stripe_customer_id, updated_at = datetime('now') WHERE id = @id
`);

export function findByGoogleId(googleId) {
  return findByGoogleIdStmt.get(googleId) || null;
}

export function findByEmail(email) {
  return findByEmailStmt.get(email) || null;
}

export function findById(id) {
  return findByIdStmt.get(id) || null;
}

export function findByStripeCustomerId(stripeId) {
  return findByStripeCustomerIdStmt.get(stripeId) || null;
}

export function createUser({ google_id, email, name, picture }) {
  const tier = email === ADMIN_EMAIL ? 'admin' : 'free';
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    google_id,
    email,
    name: name || null,
    picture: picture || null,
    tier,
    created_at: now,
    updated_at: now,
  };
  insertStmt.run(row);
  return row;
}

export function updateTier(id, tier) {
  updateTierStmt.run({ id, tier });
}

export function setStripeCustomer(id, customerId) {
  setStripeCustomerStmt.run({ id, stripe_customer_id: customerId });
}
