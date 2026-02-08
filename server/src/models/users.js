import crypto from 'crypto';
import db from './db.js';

const ADMIN_EMAIL = 'hichigg@gmail.com';

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

export function findByEmail(email) {
  return findByEmailStmt.get(email) || null;
}

export function findById(id) {
  return findByIdStmt.get(id) || null;
}

export function findByStripeCustomerId(stripeId) {
  return findByStripeCustomerIdStmt.get(stripeId) || null;
}

export function createUser({ email, name }) {
  const tier = email === ADMIN_EMAIL ? 'admin' : 'free';
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    google_id: null,
    email,
    name: name || null,
    picture: null,
    tier,
    created_at: now,
    updated_at: now,
  };
  insertStmt.run(row);
  return row;
}

export function findOrCreateByEmail(email) {
  let user = findByEmail(email);
  if (!user) {
    user = createUser({ email });
    console.log(`New user created: ${user.email} (${user.tier})`);
  }
  return user;
}

export function updateTier(id, tier) {
  updateTierStmt.run({ id, tier });
}

export function setStripeCustomer(id, customerId) {
  setStripeCustomerStmt.run({ id, stripe_customer_id: customerId });
}
