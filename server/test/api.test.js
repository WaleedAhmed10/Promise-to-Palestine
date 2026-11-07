import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { pool, query } from '../src/db.js';

let server, base;
before(async () => {
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => {
  await query(`DELETE FROM pledges WHERE email = 'test@example.invalid'`);
  server.close();
  await pool.end();
});

const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('campaign endpoint returns totals and impact tiers', async () => {
  const data = await (await fetch(`${base}/campaign`)).json();
  assert.equal(typeof data.raisedCents, 'number');
  assert.ok(data.impact.length >= 1);
});

test('pledge validation rejects bad email and tiny amounts', async () => {
  const res = await post('/pledges', { amount: 0.5, email: 'nope' });
  assert.equal(res.status, 400);
});

test('public wall never exposes email addresses', async () => {
  const rows = await (await fetch(`${base}/wall`)).json();
  assert.ok(!JSON.stringify(rows).includes('@'));
});

test('anonymous pledge hides the donor name on the wall', async (t) => {
  const mode = (await (await fetch(`${base}/campaign`)).json()).paymentMode;
  if (mode !== 'demo') return t.skip('needs DEMO_PAYMENTS=true');
  const res = await post('/pledges', { amount: 5, email: 'test@example.invalid', name: 'Secret Name', anonymous: true, message: 'test-anon' });
  assert.equal(res.status, 201);
  const rows = await (await fetch(`${base}/wall?limit=60`)).json();
  const mine = rows.find((r) => r.message === 'test-anon');
  assert.ok(mine);
  assert.equal(mine.name, null);
  assert.ok(!JSON.stringify(rows).includes('Secret Name'));
});

test('admin routes require authentication', async () => {
  assert.equal((await fetch(`${base}/admin/pledges`)).status, 401);
  assert.equal((await fetch(`${base}/admin/pledges`, { headers: { authorization: 'Bearer forged' } })).status, 401);
});

test('stripe webhook rejects unsigned requests', async () => {
  const res = await fetch(`${base}/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.ok([400, 503].includes(res.status));
});
