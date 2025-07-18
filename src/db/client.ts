import { Client, Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load appropriate environment file based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/investi_gate?sslmode=disable';

export const createPool = () => {
  return new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

export const createClient = async () => {
  const client = new Client({
    connectionString,
  });
  await client.connect();
  return client;
};

export type DatabaseClient = Client | Pool;