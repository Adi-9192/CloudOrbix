import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import clientRoutes from './routes/clients.js';
import dashboardRoutes from './routes/dashboard.js';
import excelRoutes from './routes/excel.js';
import auditRoutes from './routes/audit.js';
import reportRoutes from './routes/reports.js';
import projectRoutes from './routes/projects.js';
import serviceRoutes from './routes/services.js';
import profileTasksRoutes from './routes/profile-tasks.js';
import { initializeDatabase } from './db.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === 'production';
const distDirectory = path.resolve(process.cwd(), 'dist');
const clientEntry = path.join(distDirectory, 'index.html');
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);

if (isProduction && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production.');
if (isProduction && !process.env.CORS_ORIGINS) throw new Error('CORS_ORIGINS is required in production.');
if (process.env.SENTRY_DSN) Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development', tracesSampleRate: isProduction ? 0.1 : 0 });

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  req.requestId = requestId;
  if (isProduction && req.path !== '/api/health' && req.get('x-forwarded-proto') !== 'https') return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
  next();
});
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: isProduction ? allowedOrigins : true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

app.use(express.static(distDirectory));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'CloudOrbix API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/profile-tasks', profileTasksRoutes);

app.use((req, res, next) => {
  if (req.path === '/api' || req.path.startsWith('/api/')) return next();
  res.sendFile(clientEntry);
});

if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);

app.use((error, req, res, next) => {
  console.error('Unhandled API error:', { requestId: req.requestId, method: req.method, path: req.path, message: error.message, stack: isProduction ? undefined : error.stack });
  res.status(500).json({ message: 'Internal server error.' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CloudOrbix API listening at http://localhost:${PORT}`);
      console.log(process.env.NODE_ENV === 'production' ? 'Running in production mode.' : 'Running in development mode.');
    });
  })
  .catch((error) => {
    console.error('API startup failed:', error);
    process.exit(1);
  });
