import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  databaseUrl: required('DATABASE_URL', isProd ? undefined : 'postgres://postgres:postgres@localhost:5432/promise_to_palestine'),
  // In production a real secret is mandatory; a dev default must never ship.
  jwtSecret: required('JWT_SECRET', isProd ? undefined : 'dev-only-secret-change-me'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  // Demo mode completes pledges instantly with NO real payment. Never enable in production.
  demoPayments: process.env.DEMO_PAYMENTS === 'true' && !isProd,
  campaignSlug: process.env.CAMPAIGN_SLUG || 'promise-to-palestine',
  databaseSsl: process.env.DATABASE_SSL === 'true',
};
