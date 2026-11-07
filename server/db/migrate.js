import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from '../src/db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(dir, 'schema.sql'), 'utf8');

try {
  await pool.query(sql);
  console.log('✔ Database schema is up to date');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
