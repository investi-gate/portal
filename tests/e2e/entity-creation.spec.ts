import { test, expect } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

test.describe('Entity CRUD Operations', () => {
  let dbUtils: TestDatabaseUtils;

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    // Clean database before each test
    await dbUtils.cleanDatabase();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await dbUtils.close();
  });

  test.describe('Entity Creation', () => {
    test('should create entity with facial data type', async ({ page }) => {
      // Get initial entity count
      const initialCount = await page.locator('[data-test="entity-item"]').count();
      
      // Open entity creation form
      await page.getByTestId('add-entity-button').click();
      
      // Select facial type using checkbox
      await page.getByTestId('entity-type-facial').check();
      
      // Submit form
      await page.getByTestId('create-entity-button').click();
      
      // Wait for entity to appear in the list
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(initialCount + 1);
      
      // Verify the entity shows facial type indicator
      const newEntity = page.locator('[data-test="entity-item"]').last();
      await expect(newEntity).toContainText('👤');
      
      // Verify entity appears in the flow graph
      await expect(page.locator('.react-flow__node')).toHaveCount(1);
    });

    test('should create entity with text data type', async ({ page }) => {
      // Get initial entity count
      const initialCount = await page.locator('[data-test="entity-item"]').count();
      
      // Open entity creation form
      await page.getByTestId('add-entity-button').click();
      
      // Select text type using checkbox
      await page.getByTestId('entity-type-text').check();
      
      // Submit form
      await page.getByTestId('create-entity-button').click();
      
      // Wait for entity to appear in the list
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(initialCount + 1);
      
      // Verify the entity shows text type indicator
      const newEntity = page.locator('[data-test="entity-item"]').last();
      await expect(newEntity).toContainText('📝');
      
      // Verify entity appears in the flow graph
      await expect(page.locator('.react-flow__node')).toHaveCount(1);
    });

    test('should create entity with both data types', async ({ page }) => {
      // Get initial entity count
      const initialCount = await page.locator('[data-test="entity-item"]').count();
      
      // Open entity creation form
      await page.getByTestId('add-entity-button').click();
      
      // Select both types using checkboxes
      await page.getByTestId('entity-type-facial').check();
      await page.getByTestId('entity-type-text').check();
      
      // Submit form
      await page.getByTestId('create-entity-button').click();
      
      // Wait for entity to appear in the list
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(initialCount + 1);
      
      // Verify the entity shows both type indicators
      const newEntity = page.locator('[data-test="entity-item"]').last();
      await expect(newEntity).toContainText('👤');
      await expect(newEntity).toContainText('📝');
      
      // Verify entity appears in the flow graph
      await expect(page.locator('.react-flow__node')).toHaveCount(1);
    });

    test('should prevent creating entity without any data type', async ({ page }) => {
      // Open entity creation form
      await page.getByTestId('add-entity-button').click();
      
      // Try to submit without selecting any type
      await page.getByTestId('create-entity-button').click();
      
      // Verify error message or that form is still open
      await expect(page.getByTestId('entity-type-error')).toBeVisible();
      
      // Verify no entity was created
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(0);
    });

    test('should create multiple entities and display them correctly', async ({ page }) => {
      // Create 3 entities with different types
      const entityTypes = [
        { facial: true, text: false },
        { facial: false, text: true },
        { facial: true, text: true }
      ];

      for (let i = 0; i < entityTypes.length; i++) {
        await page.getByTestId('add-entity-button').click();
        
        if (entityTypes[i].facial) {
          await page.getByTestId('entity-type-facial').check();
        }
        if (entityTypes[i].text) {
          await page.getByTestId('entity-type-text').check();
        }
        
        await page.getByTestId('create-entity-button').click();
        
        // Wait for entity to be created
        await expect(page.locator('[data-test="entity-item"]')).toHaveCount(i + 1);
      }
      
      // Verify all entities appear in the flow graph
      await expect(page.locator('.react-flow__node')).toHaveCount(3);
      
      // Verify entity count display
      await expect(page.getByTestId('entity-count')).toContainText('3');
    });
  });

  test.describe('Entity Display and Selection', () => {
    test('should display entity details when clicked in list', async ({ page }) => {
      // Create an entity first
      await dbUtils.createTestEntity({ facial: true, text: true });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Click on the entity in the list
      await page.locator('[data-test="entity-item"]').first().click();
      
      // Verify selected item info panel shows entity details
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Entity');
      await expect(infoPanel).toContainText('ID:');
      await expect(infoPanel).toContainText('Data Types: facial, text');
    });

    test('should display entity details when node clicked in graph', async ({ page }) => {
      // Create an entity first
      await dbUtils.createTestEntity({ facial: true, text: false });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Click on the node in the flow graph
      await page.locator('.react-flow__node').first().click();
      
      // Verify selected item info panel shows entity details
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Entity');
      await expect(infoPanel).toContainText('ID:');
      await expect(infoPanel).toContainText('Data Types: facial');
    });
  });

  test.describe('Entity Deletion', () => {
    test('should delete entity successfully', async ({ page }) => {
      // Create an entity first
      const entityId = await dbUtils.createTestEntity({ facial: true, text: false });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify entity exists
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(1);
      await expect(page.locator('.react-flow__node')).toHaveCount(1);
      
      // Delete the entity
      await page.getByTestId(`delete-entity-${entityId}`).click();
      
      // Confirm deletion if there's a confirmation dialog
      const confirmButton = page.getByTestId('confirm-delete');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      // Verify entity is removed from list and graph
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(0);
      await expect(page.locator('.react-flow__node')).toHaveCount(0);
      
      // Verify entity count is updated
      await expect(page.getByTestId('entity-count')).toContainText('0');
    });

    test('should handle deletion of entity with relations', async ({ page }) => {
      // Create entities and relation
      const entity1Id = await dbUtils.createTestEntity({ facial: true, text: false });
      const entity2Id = await dbUtils.createTestEntity({ facial: false, text: true });
      await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify initial state
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(2);
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(1);
      
      // Delete first entity
      await page.getByTestId(`delete-entity-${entity1Id}`).click();
      
      // Confirm deletion if needed
      const confirmButton = page.getByTestId('confirm-delete');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      // Verify entity is deleted and relation is also removed
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(1);
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(0);
    });
  });

  test.describe('Entity Update', () => {
    test('should update entity data types', async ({ page }) => {
      // Create an entity with only facial type
      const entityId = await dbUtils.createTestEntity({ facial: true, text: false });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Click edit button for the entity
      await page.getByTestId(`edit-entity-${entityId}`).click();
      
      // Add text type
      await page.getByTestId('entity-type-text').check();
      
      // Save changes
      await page.getByTestId('save-entity-button').click();
      
      // Verify entity now shows both type indicators
      const entityItem = page.locator('[data-test="entity-item"]').first();
      await expect(entityItem).toContainText('👤');
      await expect(entityItem).toContainText('📝');
    });
  });

  test.describe('Entity List Features', () => {
    test('should paginate entity list when many entities exist', async ({ page }) => {
      // Create 25 entities to trigger pagination
      for (let i = 0; i < 25; i++) {
        await dbUtils.createTestEntity({ facial: true, text: false });
      }
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify pagination controls are visible
      await expect(page.getByTestId('pagination')).toBeVisible();
      
      // Verify first page shows limited entities (e.g., 20)
      const visibleEntities = await page.locator('[data-test="entity-item"]').count();
      expect(visibleEntities).toBeLessThanOrEqual(20);
      
      // Navigate to next page
      await page.getByTestId('next-page').click();
      
      // Verify remaining entities are shown
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(5);
    });

    test('should show empty state when no entities exist', async ({ page }) => {
      // Verify empty state message
      await expect(page.getByTestId('entity-empty-state')).toBeVisible();
      await expect(page.getByTestId('entity-empty-state')).toContainText('No entities created yet');
      
      // Verify entity count shows 0
      await expect(page.getByTestId('entity-count')).toContainText('0');
    });
  });
});