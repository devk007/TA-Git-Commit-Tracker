import express from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/status', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

export default router;
