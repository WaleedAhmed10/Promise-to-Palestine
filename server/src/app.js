import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config.js';
import { globalLimiter } from './middleware.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhook.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // correct client IPs behind a reverse proxy, for rate limiting

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      },
    },
  }));
  app.use(compression());
  app.use(cors({ origin: config.clientUrl, credentials: false }));

  // Stripe needs the raw body, so mount before express.json().
  app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

  app.use('/api', globalLimiter, express.json({ limit: '50kb' }));
  app.use('/api/admin', adminRoutes);
  app.use('/api', publicRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

  // Serve the built React app in production (single deployable).
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
    res.status(500).json({ error: 'server_error' });
  });

  return app;
}
