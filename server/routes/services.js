import express from 'express';
import { getPool } from '../db.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protectRoute, async (req, res, next) => {
  try {
    const result = await getPool().query(`SELECT s.name, COUNT(DISTINCT cs.client_id)::int project_count, COALESCE(array_agg(DISTINCT jsonb_build_object('clientId', c.client_id, 'clientName', c.client_name, 'status', c.current_status, 'completion', c.completion)) FILTER (WHERE c.id IS NOT NULL), '{}') projects FROM services s LEFT JOIN client_services cs ON cs.service_id=s.id LEFT JOIN clients c ON c.id=cs.client_id GROUP BY s.id,s.name ORDER BY s.name`);
    return res.json({ services: result.rows });
  } catch (error) { return next(error); }
});

export default router;
