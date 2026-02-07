import { Router } from 'express';

const router = Router();

router.get('/summary', (req, res) => {
  const { range } = req.query;
  res.json({
    success: true,
    data: {
      range: range || '7d',
      record: { wins: 0, losses: 0, pushes: 0 },
      roi: 0,
      units: 0,
    },
  });
});

router.get('/by-sport', (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/by-bet-type', (req, res) => {
  res.json({ success: true, data: [] });
});

export default router;
