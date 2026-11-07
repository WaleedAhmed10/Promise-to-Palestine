import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { paymentMode } from './stripe.js';

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`Promise to Palestine API on :${config.port}  [payments: ${paymentMode()}]`);
  if (paymentMode() === 'demo') console.warn('⚠ DEMO_PAYMENTS is on: pledges complete without real payment.');
});

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
