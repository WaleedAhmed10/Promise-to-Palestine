import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { stripe } from '../stripe.js';
import { wrap } from '../middleware.js';

const router = Router();

// Mounted with express.raw() so the signature can be verified against the exact bytes.
router.post('/stripe', wrap(async (req, res) => {
  if (!stripe || !config.stripeWebhookSecret) return res.status(503).end();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripeWebhookSecret);
  } catch {
    return res.status(400).send('invalid signature');
  }

  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      // Only mark paid when Stripe says funds were collected (async methods can still be pending).
      if (obj.payment_status === 'paid') {
        await query(
          `UPDATE pledges SET status='completed', completed_at=now(), subscription_id=$2
            WHERE id=$1 AND status='pending'`,
          [obj.metadata?.pledge_id, obj.subscription || null],
        );
      }
      break;
    }
    case 'checkout.session.async_payment_succeeded':
      await query(`UPDATE pledges SET status='completed', completed_at=now() WHERE id=$1 AND status='pending'`, [obj.metadata?.pledge_id]);
      break;
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      await query(`UPDATE pledges SET status='failed' WHERE id=$1 AND status='pending'`, [obj.metadata?.pledge_id]);
      break;
    case 'invoice.paid': {
      // Later months of a monthly promise become their own completed row so totals stay accurate.
      if (obj.billing_reason === 'subscription_cycle' && obj.subscription) {
        await query(
          `INSERT INTO pledges (campaign_id, donor_name, email, country, message, amount_cents, currency, frequency,
                                is_anonymous, show_amount, is_visible, status, provider, provider_ref, subscription_id, lang, completed_at)
           SELECT campaign_id, donor_name, email, country, NULL, $2, currency, 'monthly',
                  is_anonymous, show_amount, FALSE, 'completed', 'stripe', $3, subscription_id, lang, now()
             FROM pledges WHERE subscription_id = $1 ORDER BY id LIMIT 1
           ON CONFLICT (provider, provider_ref) WHERE provider_ref IS NOT NULL DO NOTHING`,
          [obj.subscription, obj.amount_paid, obj.id],
        );
      }
      break;
    }
    case 'charge.refunded':
      if (obj.payment_intent && obj.metadata?.pledge_id) {
        await query(`UPDATE pledges SET status='refunded' WHERE id=$1`, [obj.metadata.pledge_id]);
      }
      break;
    default:
      break;
  }
  res.json({ received: true });
}));

export default router;
