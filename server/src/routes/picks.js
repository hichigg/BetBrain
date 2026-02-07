import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const { sport, date } = req.query;
  res.json({
    success: true,
    data: [],
    meta: { sport: sport || 'all', date: date || new Date().toISOString().split('T')[0] },
  });
});

router.post('/analyze', (req, res) => {
  const { sport, date, gameId } = req.body;
  res.json({
    success: true,
    data: { message: 'Analysis placeholder', sport, date, gameId },
  });
});

export default router;
