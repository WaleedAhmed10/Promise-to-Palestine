import pg from 'pg';
import { config } from './config.js';

// Return BIGINT (cents) as JS numbers; our amounts stay well below 2^53.
pg.types.setTypeParser(20, (v) => Number(v));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export const query = (text, params) => pool.query(text, params);
