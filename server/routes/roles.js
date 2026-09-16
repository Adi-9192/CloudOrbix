import express from 'express';
import { appState } from '../db.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protectRoute, (req, res) => {
  return res.json({ roles: appState.roles });
});

export default router;
