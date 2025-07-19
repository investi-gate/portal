import { test, expect } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

test.describe('Relation CRUD Operations', () => {
  let dbUtils: TestDatabaseUtils;
  let entity1Id: string;
  let entity2Id: string;
  let entity3Id: string;

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    // Clean database and create test entities
    await dbUtils.cleanDatabase();
    
    // Create test entities for relations
    entity1Id = await dbUtils.createTestEntity({ facial: true, text: false });
    entity2Id = await dbUtils.createTestEntity({ facial: false, text: true });
    entity3Id = await dbUtils.createTestEntity({ facial: true, text: true });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await dbUtils.close();
  });

  test.describe('Relation Creation', () => {
    test('should create relation between two entities', async ({ page }) => {
      // Open relation creation form
      await page.getByTestId('add-relation-button').click();
      
      // Select subject entity
      await page.getByTestId('relation-subject-select').selectOption(entity1Id);
      
      // Enter predicate
      await page.getByTestId('relation-predicate-input').fill('knows');
      
      // Select object entity
      await page.getByTestId('relation-object-select').selectOption(entity2Id);
      
      // Submit form
      await page.getByTestId('create-relation-button').click();
      
      // Verify relation appears in the list
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(1);
      
      // Verify relation shows correct format
      const relationItem = page.locator('[data-test="relation-item"]').first();
      await expect(relationItem).toContainText('→ knows →');
      
      // Verify edge appears in the flow graph
      await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    });

    test('should create multiple relations between same entities', async ({ page }) => {
      // Create first relation
      await page.getByTestId('add-relation-button').click();
      await page.getByTestId('relation-subject-select').selectOption(entity1Id);
      await page.getByTestId('relation-predicate-input').fill('knows');
      await page.getByTestId('relation-object-select').selectOption(entity2Id);
      await page.getByTestId('create-relation-button').click();
      
      // Create second relation with different predicate
      await page.getByTestId('add-relation-button').click();
      await page.getByTestId('relation-subject-select').selectOption(entity1Id);
      await page.getByTestId('relation-predicate-input').fill('works_with');
      await page.getByTestId('relation-object-select').selectOption(entity2Id);
      await page.getByTestId('create-relation-button').click();
      
      // Verify both relations exist
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(2);
      
      // Verify different predicates are shown
      const relations = page.locator('[data-test="relation-item"]');
      await expect(relations.nth(0)).toContainText('knows');
      await expect(relations.nth(1)).toContainText('works_with');
      
      // Verify two edges in graph
      await expect(page.locator('.react-flow__edge')).toHaveCount(2);
    });

    test('should create chain of relations', async ({ page }) => {
      // Create relation: entity1 -> entity2
      await page.getByTestId('add-relation-button').click();
      await page.getByTestId('relation-subject-select').selectOption(entity1Id);
      await page.getByTestId('relation-predicate-input').fill('knows');
      await page.getByTestId('relation-object-select').selectOption(entity2Id);
      await page.getByTestId('create-relation-button').click();
      
      // Create relation: entity2 -> entity3
      await page.getByTestId('add-relation-button').click();
      await page.getByTestId('relation-subject-select').selectOption(entity2Id);
      await page.getByTestId('relation-predicate-input').fill('reports_to');
      await page.getByTestId('relation-object-select').selectOption(entity3Id);
      await page.getByTestId('create-relation-button').click();
      
      // Verify relations form a chain
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(2);
      await expect(page.locator('.react-flow__edge')).toHaveCount(2);
    });

    test('should validate required fields', async ({ page }) => {
      // Open relation creation form
      await page.getByTestId('add-relation-button').click();
      
      // Try to submit without filling fields
      await page.getByTestId('create-relation-button').click();
      
      // Verify validation errors
      await expect(page.getByTestId('subject-error')).toBeVisible();
      await expect(page.getByTestId('predicate-error')).toBeVisible();
      await expect(page.getByTestId('object-error')).toBeVisible();
      
      // Verify no relation was created
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(0);
    });

    test('should prevent self-referential relations if not allowed', async ({ page }) => {
      // Open relation creation form
      await page.getByTestId('add-relation-button').click();
      
      // Try to create self-referential relation
      await page.getByTestId('relation-subject-select').selectOption(entity1Id);
      await page.getByTestId('relation-predicate-input').fill('references');
      await page.getByTestId('relation-object-select').selectOption(entity1Id);
      await page.getByTestId('create-relation-button').click();
      
      // Verify error message
      await expect(page.getByTestId('relation-error')).toContainText('cannot reference itself');
      
      // Verify no relation was created
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(0);
    });
  });

  test.describe('Relation Display and Selection', () => {
    test('should display relation details when clicked in list', async ({ page }) => {
      // Create a relation first
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Click on the relation in the list
      await page.locator('[data-test="relation-item"]').first().click();
      
      // Verify selected item info panel shows relation details
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Relation');
      await expect(infoPanel).toContainText('ID:');
      await expect(infoPanel).toContainText('Predicate: knows');
      await expect(infoPanel).toContainText('Subject:');
      await expect(infoPanel).toContainText('Object:');
    });

    test('should display relation details when edge clicked in graph', async ({ page }) => {
      // Create a relation first
      await dbUtils.createTestRelation(entity1Id, 'works_with', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Click on the edge in the flow graph
      await page.locator('.react-flow__edge').first().click();
      
      // Verify selected item info panel shows relation details
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Relation');
      await expect(infoPanel).toContainText('Predicate: works_with');
    });

    test('should highlight connected entities when relation selected', async ({ page }) => {
      // Create a relation
      await dbUtils.createTestRelation(entity1Id, 'manages', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Click on the relation
      await page.locator('[data-test="relation-item"]').first().click();
      
      // Verify connected nodes are highlighted
      const nodes = page.locator('.react-flow__node');
      await expect(nodes.first()).toHaveClass(/selected|highlighted/);
      await expect(nodes.nth(1)).toHaveClass(/selected|highlighted/);
    });
  });

  test.describe('Relation Deletion', () => {
    test('should delete relation successfully', async ({ page }) => {
      // Create a relation first
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify relation exists
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(1);
      await expect(page.locator('.react-flow__edge')).toHaveCount(1);
      
      // Delete the relation
      await page.getByTestId(`delete-relation-${relationId}`).click();
      
      // Confirm deletion if there's a confirmation dialog
      const confirmButton = page.getByTestId('confirm-delete');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      // Verify relation is removed from list and graph
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(0);
      await expect(page.locator('.react-flow__edge')).toHaveCount(0);
      
      // Verify entities still exist
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(3);
    });

    test('should handle cascading deletions correctly', async ({ page }) => {
      // Create a chain of relations
      const relation1Id = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      const relation2Id = await dbUtils.createTestRelation(entity2Id, 'reports_to', entity3Id);
      
      // Create a relation that references another relation
      const metaRelationId = await dbUtils.createTestMetaRelation(relation1Id, 'implies', relation2Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify all relations exist
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(3);
      
      // Delete the first relation
      await page.getByTestId(`delete-relation-${relation1Id}`).click();
      
      // Confirm deletion
      const confirmButton = page.getByTestId('confirm-delete');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      // Verify meta-relation is also deleted
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(1);
      
      // Verify only relation2 remains
      const remainingRelation = page.locator('[data-test="relation-item"]').first();
      await expect(remainingRelation).toContainText('reports_to');
    });
  });

  test.describe('Relation Update', () => {
    test('should update relation predicate', async ({ page }) => {
      // Create a relation first
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Click edit button for the relation
      await page.getByTestId(`edit-relation-${relationId}`).click();
      
      // Update predicate
      await page.getByTestId('relation-predicate-input').fill('manages');
      
      // Save changes
      await page.getByTestId('save-relation-button').click();
      
      // Verify relation shows updated predicate
      const relationItem = page.locator('[data-test="relation-item"]').first();
      await expect(relationItem).toContainText('→ manages →');
    });

    test('should update relation subject and object', async ({ page }) => {
      // Create a relation first
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Click edit button for the relation
      await page.getByTestId(`edit-relation-${relationId}`).click();
      
      // Update subject and object
      await page.getByTestId('relation-subject-select').selectOption(entity2Id);
      await page.getByTestId('relation-object-select').selectOption(entity3Id);
      
      // Save changes
      await page.getByTestId('save-relation-button').click();
      
      // Verify relation is updated in the graph
      await expect(page.locator('.react-flow__edge')).toHaveCount(1);
      
      // Verify the edge connects different nodes now
      // This would require checking the edge's source and target attributes
    });
  });

  test.describe('Relation List Features', () => {
    test('should filter relations by predicate', async ({ page }) => {
      // Create relations with different predicates
      await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await dbUtils.createTestRelation(entity2Id, 'manages', entity3Id);
      await dbUtils.createTestRelation(entity1Id, 'works_with', entity3Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify all relations are shown
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(3);
      
      // Filter by predicate
      await page.getByTestId('predicate-filter').fill('knows');
      
      // Verify only matching relations are shown
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(1);
      await expect(page.locator('[data-test="relation-item"]').first()).toContainText('knows');
    });

    test('should show empty state when no relations exist', async ({ page }) => {
      // Clean relations but keep entities
      await dbUtils.cleanRelations();
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify empty state message
      await expect(page.getByTestId('relation-empty-state')).toBeVisible();
      await expect(page.getByTestId('relation-empty-state')).toContainText('No relations created yet');
      
      // Verify relation count shows 0
      await expect(page.getByTestId('relation-count')).toContainText('0');
    });

    test('should group relations by subject entity', async ({ page }) => {
      // Create multiple relations from same subject
      await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await dbUtils.createTestRelation(entity1Id, 'manages', entity3Id);
      await dbUtils.createTestRelation(entity2Id, 'reports_to', entity3Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Enable grouping by subject
      await page.getByTestId('group-by-subject').click();
      
      // Verify relations are grouped
      const groups = page.locator('[data-test="relation-group"]');
      await expect(groups).toHaveCount(2);
      
      // Verify first group has 2 relations
      const firstGroup = groups.first();
      await expect(firstGroup.locator('[data-test="relation-item"]')).toHaveCount(2);
    });
  });

  test.describe('Complex Relation Scenarios', () => {
    test('should create meta-relation between two relations', async ({ page }) => {
      // Create base relations
      const relation1Id = await dbUtils.createTestRelation(entity1Id, 'trusts', entity2Id);
      const relation2Id = await dbUtils.createTestRelation(entity2Id, 'betrays', entity3Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Create meta-relation
      await page.getByTestId('add-relation-button').click();
      
      // Select relation as subject
      await page.getByTestId('subject-type-relation').click();
      await page.getByTestId('relation-subject-select').selectOption(relation1Id);
      
      // Enter predicate
      await page.getByTestId('relation-predicate-input').fill('contradicts');
      
      // Select relation as object
      await page.getByTestId('object-type-relation').click();
      await page.getByTestId('relation-object-select').selectOption(relation2Id);
      
      // Create the meta-relation
      await page.getByTestId('create-relation-button').click();
      
      // Verify meta-relation is created
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(3);
      
      // Verify meta-relation displays correctly
      const metaRelation = page.locator('[data-test="relation-item"]').last();
      await expect(metaRelation).toContainText('R:');
      await expect(metaRelation).toContainText('contradicts');
    });

    test('should create relation between entity and relation', async ({ page }) => {
      // Create a base relation
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Create mixed relation (entity -> relation)
      await page.getByTestId('add-relation-button').click();
      
      // Select entity as subject
      await page.getByTestId('subject-type-entity').click();
      await page.getByTestId('relation-subject-select').selectOption(entity3Id);
      
      // Enter predicate
      await page.getByTestId('relation-predicate-input').fill('witnesses');
      
      // Select relation as object
      await page.getByTestId('object-type-relation').click();
      await page.getByTestId('relation-object-select').selectOption(relationId);
      
      // Create the relation
      await page.getByTestId('create-relation-button').click();
      
      // Verify relation is created
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(2);
      
      // Verify mixed relation displays correctly
      const mixedRelation = page.locator('[data-test="relation-item"]').last();
      await expect(mixedRelation).toContainText('E:'); // Entity indicator
      await expect(mixedRelation).toContainText('R:'); // Relation indicator
      await expect(mixedRelation).toContainText('witnesses');
    });

    test('should visualize meta-relations in the graph', async ({ page }) => {
      // Create base relations
      const relation1Id = await dbUtils.createTestRelation(entity1Id, 'collaborates', entity2Id);
      const relation2Id = await dbUtils.createTestRelation(entity2Id, 'competes', entity3Id);
      
      // Create meta-relation
      await dbUtils.createTestMetaRelation(relation1Id, 'conflicts_with', relation2Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify relation nodes appear in the graph
      const relationNodes = page.locator('.react-flow__node[style*="border: 2px dashed"]');
      await expect(relationNodes).toHaveCount(2); // Two relations as nodes
      
      // Verify meta-relation edge is styled differently
      const metaEdge = page.locator('.react-flow__edge[style*="stroke-dasharray"]');
      await expect(metaEdge).toBeVisible();
    });

    test('should select relation node in graph', async ({ page }) => {
      // Create relations where one is referenced
      const relation1Id = await dbUtils.createTestRelation(entity1Id, 'manages', entity2Id);
      const relation2Id = await dbUtils.createTestRelation(entity2Id, 'reports_to', entity3Id);
      await dbUtils.createTestMetaRelation(relation1Id, 'implies', relation2Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Click on relation node
      const relationNode = page.locator('.react-flow__node').filter({ hasText: 'manages' });
      await relationNode.click();
      
      // Verify selected relation info appears
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Selected Relation');
      await expect(infoPanel).toContainText('Predicate: manages');
      await expect(infoPanel).toContainText('Subject: Entity:');
      await expect(infoPanel).toContainText('Object: Entity:');
    });

    test('should visualize transitive relations', async ({ page }) => {
      // Create a chain: A -> B -> C -> D
      const entity4Id = await dbUtils.createTestEntity({ facial: true, text: true });
      
      await dbUtils.createTestRelation(entity1Id, 'parent_of', entity2Id);
      await dbUtils.createTestRelation(entity2Id, 'parent_of', entity3Id);
      await dbUtils.createTestRelation(entity3Id, 'parent_of', entity4Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Enable transitive relation visualization
      await page.getByTestId('show-transitive').click();
      
      // Verify indirect relations are shown
      await expect(page.locator('.react-flow__edge--transitive')).toBeVisible();
      
      // Verify we can see A is ancestor of C and D
      const transitiveEdges = page.locator('.react-flow__edge--transitive');
      await expect(transitiveEdges).toHaveCount(3); // A->C, A->D, B->D
    });
  });
});