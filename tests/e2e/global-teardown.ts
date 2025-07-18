import { teardownTestDatabase } from './setup/database';

async function globalTeardown() {
  console.log('Running global test teardown...');
  
  try {
    // Tear down test database
    await teardownTestDatabase();
    
    console.log('Global test teardown completed successfully');
  } catch (error) {
    console.error('Global test teardown failed:', error);
    // Don't throw in teardown to avoid masking test failures
  }
}

export default globalTeardown;