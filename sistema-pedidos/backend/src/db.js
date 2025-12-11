import pg from 'pg';
import { config } from './config/env.js';

const pool = new pg.Pool({
  connectionString: config.db.connectionString,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
