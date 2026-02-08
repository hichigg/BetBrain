import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { findByGoogleId, createUser } from '../models/users.js';
import { getAnalysisCount } from '../models/usage.js';
import { requireAuth } from '../middleware/auth.js';
import { getEffectiveTier, TIER_LIMITS } from '../middleware/tier.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

/**
 * POST /api/auth/google
 * Verify Google ID token, create or find user, return JWT + user info.
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Missing Google credential' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = findByGoogleId(payload.sub);
    if (!user) {
      user = createUser({
        google_id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      });
      console.log(`New user created: ${user.email} (${user.tier})`);
    }

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
          picture: user.picture,
          tier,
        },
      },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ success: false, error: 'Google authentication failed' });
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
      picture: user.picture,
      tier,
      usage: {
        analysesToday,
        analysesLimit: config.analysesPerDay === Infinity ? -1 : config.analysesPerDay,
      },
    },
  });
});

export default router;
