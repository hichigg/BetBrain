import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import gamesRouter from './routes/games.js';
import picksRouter from './routes/picks.js';
import betslipRouter from './routes/betslip.js';
import performanceRouter from './routes/performance.js';
import { getRemainingRequests } from './services/odds.js';
import { stats as cacheStats } from './services/cache.js';

// ── Validate required environment variables ────────────────────────
const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'ODDS_API_KEY'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Server cannot start without these. Check your .env file.');
  process.exit(1);
}

// ── Global process error handlers ──────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy (Railway runs behind a reverse proxy)
app.set('trust proxy', 1);

// CORS — support comma-separated origins via env var
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Rate limiting (production only)
if (isProd) {
  const generalLimit = parseInt(process.env.RATE_LIMIT_GENERAL, 10) || 100;
  const analysisLimit = parseInt(process.env.RATE_LIMIT_ANALYSIS, 10) || 10;

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: generalLimit,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, please try again later.' },
    }),
  );

  app.use(
    '/api/picks/analyze',
    rateLimit({
      windowMs: 60 * 1000,
      max: analysisLimit,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Analysis rate limit reached. Please wait a minute.' },
    }),
  );
}

app.use('/api/games', gamesRouter);
app.use('/api/picks', picksRouter);
app.use('/api/betslip', betslipRouter);
app.use('/api/performance', performanceRouter);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      cache: cacheStats(),
      odds: getRemainingRequests(),
    },
  });
});

app.get('/api/odds/usage', (req, res) => {
  res.json({ success: true, data: getRemainingRequests() });
});

// 404 handler — must be after all routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Not found: ${req.method} ${req.path}` });
});

// Error middleware
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.statusCode != null;

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  } else {
    console.error(`Error [${statusCode}]: ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: isOperational ? err.message : 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`BetBrain server running on http://localhost:${PORT}`);
});
