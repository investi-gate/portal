import { test, expect } from '@playwright/test';
import { withTestDatabase, testDataFactories } from './helpers/db-utils';

test.describe('Database Integration Tests', () => {
  test('should display entities from test database', async ({ page }) => {
    // Create test data
    await withTestDatabase(async (db) => {
      await db.clearAllData();
      await db.createEntities([
        { id: 'test-entity-display-1', type_facial_data_id: 'facial_data', type_text_data_id: null },
        { id: 'test-entity-display-2', type_facial_data_id: null, type_text_data_id: 'text_data' },
      ]);
    });

    // Navigate to the page
    await page.goto('/');
    
    // Wait for the flow to load
    await page.waitForSelector('[data-test="react-flow"]', { timeout: 10000 });
    
    // Check that entities are displayed as nodes
    const nodes = await page.locator('.react-flow__node').count();
    expect(nodes).toBeGreaterThanOrEqual(2);
  });

  test('should create and display new entity through API', async ({ page }) => {
    // Navigate to the page first
    await page.goto('/');
    
    // Create entity through API
    const response = await page.request.post('/api/entities', {
      data: {
        type_facial_data_id: 'facial_data',
        type_text_data_id: 'text_data',
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const entity = await response.json();
    
    // Reload page to see new entity
    await page.reload();
    await page.waitForSelector('[data-test="react-flow"]', { timeout: 10000 });
    
    // Verify entity exists in database
    await withTestDatabase(async (db) => {
      const exists = await db.entityExists(entity.id);
      expect(exists).toBeTruthy();
    });
  });

  test('should search entities from test database', async ({ page }) => {
    // Create searchable test data
    await withTestDatabase(async (db) => {
      await db.clearAllData();
      await testDataFactories.investigationScenario(db);
    });

    // Navigate to the page
    await page.goto('/');
    
    // Ensure sidebar is visible
    const sidebar = page.locator('[data-test="ai-sidebar"]');
    if (!(await sidebar.isVisible())) {
      await page.locator('[data-test="toggle-sidebar"]').click();
    }
    
    // Perform search
    await page.locator('[data-test="search-input"]').fill('person');
    await page.locator('[data-test="search-button"]').click();
    
    // Wait for results
    await page.waitForSelector('[data-test="search-results"]');
    
    // Verify we have results from our test data
    const resultCount = await page.locator('[data-test="search-result-item"]').count();
    expect(resultCount).toBeGreaterThan(0);
  });

  test('should display relations between entities', async ({ page }) => {
    // Create related entities
    await withTestDatabase(async (db) => {
      await db.clearAllData();
      
      // Create two entities
      await db.createEntities([
        { id: 'entity-rel-1', type_facial_data_id: 'facial_data', type_text_data_id: null },
        { id: 'entity-rel-2', type_facial_data_id: null, type_text_data_id: 'text_data' },
      ]);
      
      // Create relation between them
      await db.createRelation({
        subject_entity_id: 'entity-rel-1',
        predicate: 'connected_to',
        object_entity_id: 'entity-rel-2',
        certainty_factor: 0.9,
      });
    });

    // Navigate to the page
    await page.goto('/');
    
    // Wait for the flow to load
    await page.waitForSelector('[data-test="react-flow"]', { timeout: 10000 });
    
    // Check that edges (relations) are displayed
    const edges = await page.locator('.react-flow__edge').count();
    expect(edges).toBeGreaterThanOrEqual(1);
  });

  test('should handle empty database gracefully', async ({ page }) => {
    // Clear all data
    await withTestDatabase(async (db) => {
      await db.clearAllData();
    });

    // Navigate to the page
    await page.goto('/');
    
    // Page should load without errors
    await expect(page.locator('[data-test="main-container"]')).toBeVisible();
    
    // Flow should be visible but empty
    await page.waitForSelector('[data-test="react-flow"]', { timeout: 10000 });
    
    // No nodes should be displayed
    const nodes = await page.locator('.react-flow__node').count();
    expect(nodes).toBe(0);
  });
});