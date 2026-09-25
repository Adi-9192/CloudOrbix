import express from 'express';
import { getPool } from '../db.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protectRoute, async (req, res, next) => {
  try {
    const result = await getPool().query(`SELECT s.name, CAST(COUNT(DISTINCT cs.client_id) AS int) AS project_count, STRING_AGG(CONCAT(c.client_id, ':', c.client_name), ',') AS projects FROM services s LEFT JOIN client_services cs ON cs.service_id=s.id LEFT JOIN clients c ON c.id=cs.client_id GROUP BY s.id, s.name ORDER BY s.name`);
    return res.json({
      services: result.rows.map((row) => ({
        name: row.name,
        project_count: row.project_count,
        projects: row.projects ? String(row.projects).split(',').map((item) => item.trim()).filter(Boolean) : [],
      })),
    });
  } catch (error) { return next(error); }
});

export default router;
