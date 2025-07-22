import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load appropriate environment file based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const connectionString = process.env.DATABASE_URL!;

export const createPool = () => {
  return new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

export type DatabaseClient = Pool;
