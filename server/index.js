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
import templateRoutes from './routes/templates.js';
import serviceRoutes from './routes/services.js';
import profileTasksRoutes from './routes/profile-tasks.js';

import { initializeDatabase } from './db.js';
import { initializeStorage } from './storage.js';


const app = express();

const PORT = Number(process.env.PORT || 4000);

const isProduction =
  process.env.NODE_ENV === 'production';

const distDirectory =
  path.resolve(process.cwd(), 'dist');

const clientEntry =
  path.join(distDirectory, 'index.html');

const allowedOrigins =
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);


/*
 * Validate required production settings.
 */
if (
  isProduction &&
  !process.env.DATABASE_URL
) {
  throw new Error(
    'DATABASE_URL is required in production.'
  );
}

if (
  isProduction &&
  !process.env.CORS_ORIGINS
) {
  throw new Error(
    'CORS_ORIGINS is required in production.'
  );
}


/*
 * Sentry initialization.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    environment:
      process.env.NODE_ENV ||
      'development',

    tracesSampleRate:
      isProduction ? 0.1 : 0,
  });
}


/*
 * Express configuration.
 */
app.disable('x-powered-by');

/*
 * Azure App Service runs behind a reverse proxy.
 */
app.set('trust proxy', 1);


/*
 * Request ID and HTTPS redirect.
 */
app.use((req, res, next) => {
  const requestId =
    req.get('x-request-id') ||
    crypto.randomUUID();

  res.setHeader(
    'x-request-id',
    requestId
  );

  req.requestId = requestId;

  if (
    isProduction &&
    req.path !== '/api/health' &&
    req.get('x-forwarded-proto') !== 'https'
  ) {
    return res.redirect(
      308,
      `https://${req.get('host')}${req.originalUrl}`
    );
  }

  next();
});


/*
 * Security middleware.
 */
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);


/*
 * CORS.
 */
app.use(
  cors({
    origin:
      isProduction
        ? allowedOrigins
        : true,

    credentials: true,
  })
);


/*
 * JSON body parser.
 */
app.use(
  express.json({
    limit: '1mb',
  })
);


/*
 * Normalize client IP address for rate limiting.
 *
 * Azure proxies can provide an IPv4 address containing
 * a source port, for example:
 *
 * 167.103.72.103:16568
 *
 * The port must not become part of the rate-limit key.
 */
const rateLimitKeyGenerator = (req) => {
  const ip =
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';

  return String(ip).replace(
    /:\d+[^:]*$/,
    ''
  );
};


/*
 * Authentication rate limiter.
 *
 * Maximum:
 * 20 requests every 15 minutes.
 */
const authLimiter = rateLimit({
  windowMs:
    15 * 60 * 1000,

  limit: 20,

  standardHeaders:
    'draft-7',

  legacyHeaders:
    false,

  keyGenerator:
    rateLimitKeyGenerator,
});


/*
 * General API rate limiter.
 *
 * Maximum:
 * 300 requests every minute.
 */
const apiLimiter = rateLimit({
  windowMs:
    60 * 1000,

  limit: 300,

  standardHeaders:
    'draft-7',

  legacyHeaders:
    false,

  keyGenerator:
    rateLimitKeyGenerator,
});


app.use(
  '/api/auth',
  authLimiter
);

app.use(
  '/api',
  apiLimiter
);


/*
 * Frontend static files.
 */
app.use(
  express.static(
    distDirectory
  )
);


/*
 * Health endpoint.
 */
app.get(
  '/api/health',
  (req, res) => {
    res.json({
      ok: true,

      service:
        'CloudOrbix API',

      timestamp:
        new Date().toISOString(),
    });
  }
);


/*
 * API routes.
 */
app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/users',
  userRoutes
);

app.use(
  '/api/roles',
  roleRoutes
);

app.use(
  '/api/clients',
  clientRoutes
);

app.use(
  '/api/dashboard',
  dashboardRoutes
);

app.use(
  '/api/excel',
  excelRoutes
);

app.use(
  '/api/audit',
  auditRoutes
);

app.use(
  '/api/reports',
  reportRoutes
);

app.use(
  '/api/projects',
  projectRoutes
);

app.use(
  '/api/templates',
  templateRoutes
);

app.use(
  '/api/services',
  serviceRoutes
);

app.use(
  '/api/profile-tasks',
  profileTasksRoutes
);


/*
 * Send the frontend application for
 * non-API URLs.
 */
app.use((req, res, next) => {
  if (
    req.path === '/api' ||
    req.path.startsWith('/api/')
  ) {
    return next();
  }

  res.sendFile(
    clientEntry
  );
});


/*
 * Sentry Express error handler.
 */
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(
    app
  );
}


/*
 * General API error handler.
 */
app.use(
  (error, req, res, next) => {
    console.error(
      'Unhandled API error:',
      {
        requestId:
          req.requestId,

        method:
          req.method,

        path:
          req.path,

        message:
          error.message,

        stack:
          isProduction
            ? undefined
            : error.stack,
      }
    );

    res.status(500).json({
      message:
        'Internal server error.',
    });
  }
);


/*
 * Application startup.
 *
 * 1. Connect to Azure SQL
 * 2. Connect to Azure Blob Storage
 * 3. Start Express
 */
async function startServer() {
  try {
    await initializeDatabase();

    await initializeStorage();

    app.listen(
      PORT,
      () => {
        console.log(
          `CloudOrbix API listening at http://localhost:${PORT}`
        );

        console.log(
          isProduction
            ? 'Running in production mode.'
            : 'Running in development mode.'
        );
      }
    );
  } catch (error) {
    console.error(
      'API startup failed:',
      error
    );

    process.exit(1);
  }
}


startServer();
