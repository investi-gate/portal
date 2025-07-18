import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Load test environment variables
dotenv.config({ path: '.env.test' });

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/investi_gate_test?sslmode=disable';

// Parse database name from connection string
const getDatabaseName = (url: string): string => {
  const match = url.match(/\/([^?]+)(\?|$)/);
  return match ? match[1] : 'investi_gate_test';
};

// Parse connection URL without database name
const getConnectionUrl = (url: string): string => {
  const parts = url.split('/');
  parts[parts.length - 1] = 'postgres' + (parts[parts.length - 1].includes('?') ? parts[parts.length - 1].substring(parts[parts.length - 1].indexOf('?')) : '');
  return parts.join('/');
};

export async function setupTestDatabase() {
  const dbName = getDatabaseName(TEST_DATABASE_URL);
  const connectionUrl = getConnectionUrl(TEST_DATABASE_URL);
  
  console.log(`Setting up test database: ${dbName}`);
  
  // Connect to postgres database to create test database
  const client = new Client({ connectionString: connectionUrl });
  
  try {
    await client.connect();
    
    // Drop existing test database if exists
    await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`Dropped existing database: ${dbName}`);
    
    // Create new test database
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Created test database: ${dbName}`);
    
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  } finally {
    await client.end();
  }
  
  // Run migrations on test database
  await runMigrations();
}

export async function teardownTestDatabase() {
  const dbName = getDatabaseName(TEST_DATABASE_URL);
  const connectionUrl = getConnectionUrl(TEST_DATABASE_URL);
  
  console.log(`Tearing down test database: ${dbName}`);
  
  const client = new Client({ connectionString: connectionUrl });
  
  try {
    await client.connect();
    
    // Force disconnect all connections to test database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid()
    `);
    
    // Drop test database
    await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`Dropped test database: ${dbName}`);
    
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function runMigrations() {
  console.log('Running migrations on test database...');
  
  // Get the migrations directory path
  const migrationsPath = path.resolve(__dirname, '../../../migrations');
  
  try {
    // Change to migrations directory and run migrations
    const { stdout, stderr } = await execAsync(
      `cd ${migrationsPath} && DATABASE_URL="${TEST_DATABASE_URL}" task up`,
      { env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL } }
    );
    
    if (stderr && !stderr.includes('up to date')) {
      console.error('Migration stderr:', stderr);
    }
    
    console.log('Migrations completed successfully');
    if (stdout) {
      console.log('Migration output:', stdout);
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

export async function seedTestData() {
  console.log('Seeding test data...');
  
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  
  try {
    await client.connect();
    
    // Insert test entity types
    await client.query(`
      INSERT INTO entity_types (id, name, description) VALUES 
      ('facial_data', 'Facial Data', 'Facial recognition data type'),
      ('text_data', 'Text Data', 'Textual information type')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Insert test entities
    await client.query(`
      INSERT INTO entities (id, type_facial_data_id, type_text_data_id) VALUES
      ('test-entity-1', 'facial_data', NULL),
      ('test-entity-2', NULL, 'text_data'),
      ('test-entity-3', 'facial_data', 'text_data')
    `);
    
    // Insert test relations
    await client.query(`
      INSERT INTO relations (id, subject_entity_id, predicate, object_entity_id, certainty_factor) VALUES
      ('test-relation-1', 'test-entity-1', 'knows', 'test-entity-2', 0.85),
      ('test-relation-2', 'test-entity-2', 'works_with', 'test-entity-3', 0.95)
    `);
    
    console.log('Test data seeded successfully');
    
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  } finally {
    await client.end();
  }
}

export async function clearTestData() {
  console.log('Clearing test data...');
  
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  
  try {
    await client.connect();
    
    // Clear data in correct order due to foreign key constraints
    await client.query('DELETE FROM relations');
    await client.query('DELETE FROM entities');
    
    console.log('Test data cleared successfully');
    
  } catch (error) {
    console.error('Error clearing test data:', error);
    throw error;
  } finally {
    await client.end();
  }
}