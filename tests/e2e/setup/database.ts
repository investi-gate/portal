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
  // Match the database name between the last slash and either ? or end of string
  const match = url.match(/\/([^/?]+)(?:\?|$)/);
  if (match && match[1]) {
    // Extract just the database name, not the full path
    const parts = match[1].split('/');
    return parts[parts.length - 1];
  }
  return 'investi_gate_test';
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
  
  console.log(`Setting up test database: ${TEST_DATABASE_URL}`);
  console.log(`Parsed database name: ${dbName}`);
  console.log(`Connection URL: ${connectionUrl}`);
  
  // Connect to postgres database to create test database
  const client = new Client({ connectionString: connectionUrl });
  
  try {
    await client.connect();
    
    // Drop existing test database if exists
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`Dropped existing database: ${dbName}`);
    
    // Create new test database
    await client.query(`CREATE DATABASE "${dbName}"`);
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
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
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
  const migrationsPath = path.resolve(__dirname, '../../../../migrations');
  
  try {
    // Change to migrations directory and run migrations
    const { stdout, stderr } = await execAsync(
      `migrate -path ${migrationsPath}/files -database "${TEST_DATABASE_URL}" up`,
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
    
    // Insert test entity types - facial data
    const facialResult = await client.query(`
      INSERT INTO entity_type__facial_data DEFAULT VALUES
      RETURNING id
    `);
    const facialDataId = facialResult.rows[0].id;
    
    // Insert test entity types - text data
    const textResult = await client.query(`
      INSERT INTO entity_type__text_data DEFAULT VALUES
      RETURNING id
    `);
    const textDataId = textResult.rows[0].id;
    
    // Insert test entities
    const entityResult = await client.query(`
      INSERT INTO entities (type_facial_data_id, type_text_data_id) VALUES
      ($1, NULL),
      (NULL, $2),
      ($3, $4)
      RETURNING id
    `, [facialDataId, textDataId, facialDataId, textDataId]);
    
    const [entity1, entity2, entity3] = entityResult.rows;
    
    // Insert test relations
    await client.query(`
      INSERT INTO relations (subject_entity_id, predicate, object_entity_id) VALUES
      ($1, 'knows', $2),
      ($3, 'works_with', $4)
    `, [entity1.id, entity2.id, entity2.id, entity3.id]);
    
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
    await client.query('DELETE FROM entity_type__facial_data');
    await client.query('DELETE FROM entity_type__text_data');
    
    console.log('Test data cleared successfully');
    
  } catch (error) {
    console.error('Error clearing test data:', error);
    throw error;
  } finally {
    await client.end();
  }
}