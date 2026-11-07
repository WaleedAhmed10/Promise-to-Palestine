import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db.js';
import { config } from '../config.js';
import { SUPPORTED_LANGS, loginLimiter, requireAdmin, validate, wrap } from '../middleware.js';

const router = Router();

// Constant-time-ish: always run a bcrypt compare, even for unknown users.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/login', loginLimiter,
  validate(z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) })),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT id, email, password_hash FROM admins WHERE email=$1', [req.body.email]);
    const admin = rows[0];
    const ok = await bcrypt.compare(req.body.password, admin?.password_hash ?? DUMMY_HASH);
    if (!admin || !ok) return res.status(401).json({ error: 'invalid_credentials' });
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '8h' });
    res.json({ token, email: admin.email });
  }));

router.use(requireAdmin);

router.get('/summary', wrap(async (_req, res) => {
  const [{ rows: [t] }, { rows: daily }, { rows: [n] }] = await Promise.all([
    query(`SELECT COALESCE(SUM(amount_cents) FILTER (WHERE status='completed'),0) AS raised,
                  COUNT(*) FILTER (WHERE status='completed') AS completed,
                  COUNT(*) FILTER (WHERE status='pending') AS pending,
                  COUNT(*) FILTER (WHERE status='completed' AND frequency='monthly') AS monthly
             FROM pledges`),
    query(`SELECT to_char(date_trunc('day', completed_at), 'YYYY-MM-DD') AS day, SUM(amount_cents) AS cents
             FROM pledges WHERE status='completed' AND completed_at > now() - interval '30 days'
            GROUP BY 1 ORDER BY 1`),
    query('SELECT COUNT(*) AS c FROM newsletter'),
  ]);
  res.json({
    raisedCents: Number(t.raised), completed: Number(t.completed), pending: Number(t.pending),
    monthly: Number(t.monthly), subscribers: Number(n.c),
    daily: daily.map((d) => ({ day: d.day, cents: Number(d.cents) })),
  });
}));

router.get('/pledges', wrap(async (req, res) => {
  const status = ['pending', 'completed', 'failed', 'refunded'].includes(req.query.status) ? req.query.status : null;
  const { rows } = await query(
    `SELECT id, donor_name, email, country, message, amount_cents, frequency, status, provider,
            is_anonymous, is_visible, created_at, completed_at
       FROM pledges WHERE ($1::text IS NULL OR status = $1)
      ORDER BY created_at DESC LIMIT 200`,
    [status],
  );
  res.json(rows);
}));

router.patch('/pledges/:id',
  validate(z.object({ status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(), isVisible: z.boolean().optional() })),
  wrap(async (req, res) => {
    const { status, isVisible } = req.body;
    const { rows } = await query(
      `UPDATE pledges SET
          status = COALESCE($2, status),
          is_visible = COALESCE($3, is_visible),
          completed_at = CASE WHEN $2 = 'completed' AND completed_at IS NULL THEN now() ELSE completed_at END,
          provider = CASE WHEN $2 = 'completed' AND provider IS NULL THEN 'manual' ELSE provider END
        WHERE id = $1 RETURNING id`,
      [req.params.id, status ?? null, isVisible ?? null],
    );
    if (!rows[0]) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  }));

const langMap = (min) => z.record(z.enum(SUPPORTED_LANGS), z.string().trim().max(20000)).refine((m) => (m.en ?? '').length >= min, { message: 'English text is required as the fallback' });

const storySchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title: langMap(1),
  summary: langMap(0).default({ en: '' }),
  body: langMap(1),
  imageUrl: z.string().url().max(500).nullable().optional(),
  isPublished: z.boolean().default(true),
});

router.get('/stories', wrap(async (_req, res) => {
  const { rows } = await query('SELECT * FROM stories ORDER BY published_at DESC');
  res.json(rows);
}));

router.post('/stories', validate(storySchema), wrap(async (req, res) => {
  const s = req.body;
  try {
    const { rows: [r] } = await query(
      `INSERT INTO stories (slug, title, summary, body, image_url, is_published) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [s.slug, s.title, s.summary, s.body, s.imageUrl ?? null, s.isPublished],
    );
    res.status(201).json({ id: r.id });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'slug_taken' });
    throw e;
  }
}));

router.put('/stories/:id', validate(storySchema), wrap(async (req, res) => {
  const s = req.body;
  const { rowCount } = await query(
    `UPDATE stories SET slug=$2, title=$3, summary=$4, body=$5, image_url=$6, is_published=$7 WHERE id=$1`,
    [req.params.id, s.slug, s.title, s.summary, s.body, s.imageUrl ?? null, s.isPublished],
  );
  if (!rowCount) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
}));

router.delete('/stories/:id', wrap(async (req, res) => {
  await query('DELETE FROM stories WHERE id=$1', [req.params.id]);
  res.status(204).end();
}));

router.patch('/campaign',
  validate(z.object({ goal: z.number().min(1).max(1e9), allocation: z.record(z.string(), z.number().min(0).max(100)).optional() })),
  wrap(async (req, res) => {
    const { goal, allocation } = req.body;
    if (allocation && Math.round(Object.values(allocation).reduce((a, b) => a + b, 0)) !== 100) {
      return res.status(400).json({ error: 'allocation_must_total_100' });
    }
    await query(
      `UPDATE campaigns SET goal_cents=$2, allocation=COALESCE($3::jsonb, allocation) WHERE slug=$1`,
      [config.campaignSlug, Math.round(goal * 100), allocation ? JSON.stringify(allocation) : null],
    );
    res.json({ ok: true });
  }));

export default router;
