import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/', (req, res) => {
  res.json({ success: true, data: { message: 'Pick added placeholder', pick: req.body } });
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ success: true, data: { id, ...req.body } });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ success: true, data: { id, deleted: true } });
});

export default router;
