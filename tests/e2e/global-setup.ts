import { setupTestDatabase, seedTestData } from './setup/database';

async function globalSetup() {
  console.log('Running global test setup...');
  
  try {
    // Set up test database
    await setupTestDatabase();
    
    // Seed initial test data
    await seedTestData();
    
    console.log('Global test setup completed successfully');
  } catch (error) {
    console.error('Global test setup failed:', error);
    throw error;
  }
}

export default globalSetup;