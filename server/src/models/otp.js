import crypto from 'crypto';
import db from './db.js';

const OTP_EXPIRY_MINUTES = 5;

const insertStmt = db.prepare(`
  INSERT INTO otp_codes (email, code, expires_at) VALUES (@email, @code, @expires_at)
`);

const findStmt = db.prepare(`
  SELECT * FROM otp_codes
  WHERE email = @email AND code = @code AND used = 0 AND expires_at > datetime('now')
  ORDER BY created_at DESC LIMIT 1
`);

const markUsedStmt = db.prepare(`UPDATE otp_codes SET used = 1 WHERE id = ?`);

const cleanupStmt = db.prepare(`DELETE FROM otp_codes WHERE expires_at < datetime('now') OR used = 1`);

export function createOTP(email) {
  // Generate 6-digit code
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  insertStmt.run({ email, code, expires_at: expiresAt });
  return code;
}

export function verifyOTP(email, code) {
  const row = findStmt.get({ email, code });
  if (!row) return false;
  markUsedStmt.run(row.id);
  return true;
}

export function cleanupExpired() {
  const result = cleanupStmt.run();
  return result.changes;
}
