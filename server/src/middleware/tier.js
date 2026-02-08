import { getAnalysisCount } from '../models/usage.js';

const ADMIN_EMAIL = 'hichigg@gmail.com';

export const TIER_LIMITS = {
  free: {
    analysesPerDay: 1,
    model: 'claude-sonnet-4-5-20250929',
    canFetchFreshOdds: false,
  },
  subscriber: {
    analysesPerDay: 50,
    model: 'claude-opus-4-6',
    canFetchFreshOdds: true,
  },
  admin: {
    analysesPerDay: Infinity,
    model: 'claude-opus-4-6',
    canFetchFreshOdds: true,
  },
};

export function getEffectiveTier(user) {
  if (!user) return 'free';
  if (user.email === ADMIN_EMAIL) return 'admin';
  return user.tier || 'free';
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function requireAnalysisQuota(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const tier = getEffectiveTier(user);
  const config = TIER_LIMITS[tier];
  const today = todayStr();
  const used = getAnalysisCount(user.id, today);

  if (used >= config.analysesPerDay) {
    return res.status(429).json({
      success: false,
      error: tier === 'free'
        ? 'Daily analysis limit reached (1/day on Free). Upgrade to Pro for 50/day.'
        : 'Daily analysis limit reached.',
      tier,
      used,
      limit: config.analysesPerDay,
    });
  }

  req.tierConfig = {
    model: config.model,
    canFetchFreshOdds: config.canFetchFreshOdds,
    tier,
    remaining: config.analysesPerDay - used,
  };
  next();
}

export function attachTierConfig(req, res, next) {
  const tier = getEffectiveTier(req.user);
  const config = TIER_LIMITS[tier];
  req.tierConfig = {
    model: config.model,
    canFetchFreshOdds: config.canFetchFreshOdds,
    tier,
  };
  next();
}
