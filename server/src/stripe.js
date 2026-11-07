import Stripe from 'stripe';
import { config } from './config.js';

export const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

export function paymentMode() {
  if (stripe) return 'stripe';
  if (config.demoPayments) return 'demo';
  return 'unavailable';
}
