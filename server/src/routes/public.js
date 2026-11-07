import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { config } from '../config.js';
import { stripe, paymentMode } from '../stripe.js';
import { SUPPORTED_LANGS, pledgeLimiter, newsletterLimiter, validate, wrap } from '../middleware.js';

const router = Router();

async function getCampaign() {
  const { rows } = await query('SELECT * FROM campaigns WHERE slug = $1 AND is_active', [config.campaignSlug]);
  return rows[0] || null;
}

router.get('/health', wrap(async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true });
}));

router.get('/campaign', wrap(async (_req, res) => {
  const campaign = await getCampaign();
  if (!campaign) return res.status(404).json({ error: 'campaign_not_found' });

  const [{ rows: [totals] }, { rows: impact }] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(amount_cents),0) AS raised, COUNT(*) AS supporters,
              COUNT(DISTINCT country) FILTER (WHERE country IS NOT NULL) AS countries
         FROM pledges WHERE campaign_id = $1 AND status = 'completed'`,
      [campaign.id],
    ),
    query('SELECT key, amount_cents, icon FROM impact_items WHERE campaign_id = $1 ORDER BY sort_order', [campaign.id]),
  ]);

  res.set('Cache-Control', 'public, max-age=15');
  res.json({
    slug: campaign.slug,
    currency: campaign.currency,
    goalCents: campaign.goal_cents,
    raisedCents: Number(totals.raised),
    supporters: Number(totals.supporters),
    countries: Number(totals.countries),
    allocation: campaign.allocation,
    impact: impact.map((i) => ({ key: i.key, amountCents: i.amount_cents, icon: i.icon })),
    paymentMode: paymentMode(),
  });
}));

router.get('/wall', wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 24, 60);
  const campaign = await getCampaign();
  if (!campaign) return res.json([]);
  const { rows } = await query(
    `SELECT CASE WHEN is_anonymous THEN NULL ELSE donor_name END AS name,
            country, message,
            CASE WHEN show_amount THEN amount_cents END AS amount_cents,
            frequency, completed_at
       FROM pledges
      WHERE campaign_id = $1 AND status = 'completed' AND is_visible
      ORDER BY completed_at DESC NULLS LAST
      LIMIT $2`,
    [campaign.id, limit],
  );
  res.set('Cache-Control', 'public, max-age=15');
  res.json(rows.map((r) => ({
    name: r.name, country: r.country, message: r.message,
    amountCents: r.amount_cents, frequency: r.frequency, at: r.completed_at,
  })));
}));

const pledgeSchema = z.object({
  amount: z.number().min(1).max(50000),                    // whole currency units, may have cents
  frequency: z.enum(['once', 'monthly']).default('once'),
  name: z.string().trim().max(80).optional().transform((v) => v || null),
  email: z.string().trim().toLowerCase().email().max(200),
  country: z.string().trim().length(2).toUpperCase().optional(),
  message: z.string().trim().max(280).optional().transform((v) => v || null),
  anonymous: z.boolean().default(false),
  showAmount: z.boolean().default(true),
  lang: z.enum(SUPPORTED_LANGS).default('en'),
});

router.post('/pledges', pledgeLimiter, validate(pledgeSchema), wrap(async (req, res) => {
  const mode = paymentMode();
  if (mode === 'unavailable') return res.status(503).json({ error: 'payments_unavailable' });

  const campaign = await getCampaign();
  if (!campaign) return res.status(404).json({ error: 'campaign_not_found' });

  const d = req.body;
  const amountCents = Math.round(d.amount * 100);

  const { rows: [pledge] } = await query(
    `INSERT INTO pledges (campaign_id, donor_name, email, country, message, amount_cents, currency,
                          frequency, is_anonymous, show_amount, provider, lang)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [campaign.id, d.name, d.email, d.country ?? null, d.message, amountCents, campaign.currency,
     d.frequency, d.anonymous, d.showAmount, mode, d.lang],
  );

  if (mode === 'demo') {
    await query(`UPDATE pledges SET status='completed', completed_at=now(), provider_ref=$2 WHERE id=$1`, [pledge.id, `demo_${pledge.id}`]);
    return res.status(201).json({ id: pledge.id, demo: true, redirect: `${config.clientUrl}/thank-you?demo=1` });
  }

  const recurring = d.frequency === 'monthly';
  const session = await stripe.checkout.sessions.create({
    mode: recurring ? 'subscription' : 'payment',
    customer_email: d.email,
    locale: ['en', 'ar', 'fr', 'tr', 'es'].includes(d.lang) ? d.lang : 'auto',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: campaign.currency.toLowerCase(),
        unit_amount: amountCents,
        product_data: { name: 'Promise to Palestine: Love Beyond Borders' },
        ...(recurring ? { recurring: { interval: 'month' } } : {}),
      },
    }],
    metadata: { pledge_id: String(pledge.id) },
    ...(recurring ? { subscription_data: { metadata: { pledge_id: String(pledge.id) } } } : { payment_intent_data: { metadata: { pledge_id: String(pledge.id) } } }),
    success_url: `${config.clientUrl}/thank-you`,
    cancel_url: `${config.clientUrl}/donate?cancelled=1`,
  });
  await query('UPDATE pledges SET provider_ref=$2 WHERE id=$1', [pledge.id, session.id]);
  res.status(201).json({ id: pledge.id, redirect: session.url });
}));

router.get('/stories', wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT slug, title, summary, image_url, published_at FROM stories
      WHERE is_published ORDER BY published_at DESC LIMIT 50`,
  );
  res.set('Cache-Control', 'public, max-age=60');
  res.json(rows.map((r) => ({ slug: r.slug, title: r.title, summary: r.summary, imageUrl: r.image_url, publishedAt: r.published_at })));
}));

router.get('/stories/:slug', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT slug, title, summary, body, image_url, published_at FROM stories WHERE slug=$1 AND is_published`,
    [req.params.slug],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  const r = rows[0];
  res.json({ slug: r.slug, title: r.title, summary: r.summary, body: r.body, imageUrl: r.image_url, publishedAt: r.published_at });
}));

router.post('/newsletter', newsletterLimiter,
  validate(z.object({ email: z.string().trim().toLowerCase().email().max(200), lang: z.enum(SUPPORTED_LANGS).default('en') })),
  wrap(async (req, res) => {
    await query('INSERT INTO newsletter (email, lang) VALUES ($1,$2) ON CONFLICT (email) DO NOTHING', [req.body.email, req.body.lang]);
    res.status(201).json({ ok: true });  // identical response whether new or existing: no email enumeration
  }));

export default router;
