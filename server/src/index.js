import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import gamesRouter from './routes/games.js';
import picksRouter from './routes/picks.js';
import betslipRouter from './routes/betslip.js';
import performanceRouter from './routes/performance.js';
import { getRemainingRequests } from './services/odds.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/games', gamesRouter);
app.use('/api/picks', picksRouter);
app.use('/api/betslip', betslipRouter);
app.use('/api/performance', performanceRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.get('/api/odds/usage', (req, res) => {
  res.json({ success: true, data: getRemainingRequests() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`BetBrain server running on http://localhost:${PORT}`);
});
