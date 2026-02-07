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

router.get('/:gameId', (req, res) => {
  const { gameId } = req.params;
  res.json({
    success: true,
    data: { id: gameId, message: 'Game detail placeholder' },
  });
});

export default router;
