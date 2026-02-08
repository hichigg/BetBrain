import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { findOrCreateByEmail } from '../models/users.js';
import { createOTP, verifyOTP } from '../models/otp.js';
import { sendOTP } from '../services/email.js';
import { getAnalysisCount } from '../models/usage.js';
import { requireAuth } from '../middleware/auth.js';
import { getEffectiveTier, TIER_LIMITS } from '../middleware/tier.js';

const router = Router();

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, tier: user.tier },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/send-otp
 * Generate OTP and send it to the provided email.
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }

    const code = createOTP(email.toLowerCase());
    await sendOTP(email.toLowerCase(), code);

    res.json({ success: true, data: { message: 'Verification code sent' } });
  } catch (err) {
    console.error('Send OTP error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send verification code' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP, create/find user, return JWT + user info.
 */
router.post('/verify-otp', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and code are required' });
    }

    const valid = verifyOTP(email.toLowerCase(), code);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid or expired code' });
    }

    const user = findOrCreateByEmail(email.toLowerCase());
    const token = signToken(user);
    const tier = getEffectiveTier(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier,
        },
      },
    });
  } catch (err) {
    console.error('Verify OTP error:', err.message);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

/**
 * GET /api/auth/me
 * Returns current user profile + usage stats.
 */
router.get('/me', requireAuth, (req, res) => {
  const user = req.user;
  const tier = getEffectiveTier(user);
  const config = TIER_LIMITS[tier];
  const today = todayStr();
  const analysesToday = getAnalysisCount(user.id, today);

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      tier,
      usage: {
        analysesToday,
        analysesLimit: config.analysesPerDay === Infinity ? -1 : config.analysesPerDay,
      },
    },
  });
});

export default router;
