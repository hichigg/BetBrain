import { Router } from 'express';
import { getSummary, getBySport, getByBetType, getROI } from '../models/performance.js';

const router = Router();

/**
 * GET /api/performance/summary?range=7d
 */
router.get('/summary', (req, res) => {
  try {
    const { range = '7d' } = req.query;
    res.json({ success: true, data: getSummary(range) });
  } catch (err) {
    console.error('GET /api/performance/summary error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

/**
 * GET /api/performance/by-sport
 */
router.get('/by-sport', (req, res) => {
  try {
    res.json({ success: true, data: getBySport() });
  } catch (err) {
    console.error('GET /api/performance/by-sport error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch sport breakdown' });
  }
});

/**
 * GET /api/performance/by-bet-type
 */
router.get('/by-bet-type', (req, res) => {
  try {
    res.json({ success: true, data: getByBetType() });
  } catch (err) {
    console.error('GET /api/performance/by-bet-type error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch bet type breakdown' });
  }
});

/**
 * GET /api/performance/roi?range=30d
 */
router.get('/roi', (req, res) => {
  try {
    const { range = '30d' } = req.query;
    res.json({ success: true, data: getROI(range) });
  } catch (err) {
    console.error('GET /api/performance/roi error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch ROI data' });
  }
});

export default router;
