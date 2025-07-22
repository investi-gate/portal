import { test, expect, Page } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

// Helper class for common relation operations
class RelationTestHelpers {
  constructor(private page: Page) {}

  async createRelation(subjectId: string, predicate: string, objectId: string) {
    await this.page.getByTestId('add-relation-button').click();
    await this.page.getByTestId('relation-subject-select').selectOption(subjectId);
    await this.page.getByTestId('relation-predicate-input').fill(predicate);
    await this.page.getByTestId('relation-object-select').selectOption(objectId);
    await this.page.getByTestId('create-relation-button').click();
  }

  async verifyRelationCount(count: number) {
    await expect(this.page.locator('[data-test="relation-item"]')).toHaveCount(count);
  }

  async verifyEdgeCount(count: number) {
    await expect(this.page.locator('.react-flow__edge')).toHaveCount(count);
  }

  async verifyRelationText(index: number, text: string) {
    const relationItem = this.page.locator('[data-test="relation-item"]').nth(index);
    await expect(relationItem).toContainText(text);
  }

  async deleteRelation(relationId: string) {
    await this.page.getByTestId(`delete-relation-${relationId}`).click();
    const confirmButton = this.page.getByTestId('confirm-delete');
    if (await confirmButton.isVisible({ timeout: 1000 })) {
      await confirmButton.click();
    }
  }

  async editRelation(relationId: string) {
    await this.page.getByTestId(`edit-relation-${relationId}`).click();
  }

  async saveRelation() {
    await this.page.getByTestId('save-relation-button').click();
  }

  async verifyInfoPanelVisible() {
    const infoPanel = this.page.getByTestId('selected-item-info');
    await expect(infoPanel).toBeVisible();
    return infoPanel;
  }

  async selectRelationType(type: 'entity' | 'relation', position: 'subject' | 'object') {
    await this.page.getByTestId(`${position}-type-${type}`).click();
  }

  async createMetaRelation(
    subjectId: string,
    subjectType: 'entity' | 'relation',
    predicate: string,
    objectId: string,
    objectType: 'entity' | 'relation'
  ) {
    await this.page.getByTestId('add-relation-button').click();
    await this.selectRelationType(subjectType, 'subject');
    await this.page.getByTestId('relation-subject-select').selectOption(subjectId);
    await this.page.getByTestId('relation-predicate-input').fill(predicate);
    await this.selectRelationType(objectType, 'object');
    await this.page.getByTestId('relation-object-select').selectOption(objectId);
    await this.page.getByTestId('create-relation-button').click();
  }
}

test.describe('Relation CRUD Operations', () => {
  let dbUtils: TestDatabaseUtils;
  let helpers: RelationTestHelpers;
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
    
    // Initialize helpers
    helpers = new RelationTestHelpers(page);
  });

  test.afterAll(async () => {
    await dbUtils.close();
  });

  test.describe('Relation Creation', () => {
    test('should create relation between two entities', async ({ page }) => {
      await helpers.createRelation(entity1Id, 'knows', entity2Id);
      
      await helpers.verifyRelationCount(1);
      await helpers.verifyRelationText(0, '→ knows →');
      await helpers.verifyEdgeCount(1);
    });

    test('should create multiple relations between same entities', async ({ page }) => {
      await helpers.createRelation(entity1Id, 'knows', entity2Id);
      await helpers.createRelation(entity1Id, 'works_with', entity2Id);
      
      await helpers.verifyRelationCount(2);
      await helpers.verifyRelationText(0, 'knows');
      await helpers.verifyRelationText(1, 'works_with');
      await helpers.verifyEdgeCount(2);
    });

    test('should create chain of relations', async ({ page }) => {
      await helpers.createRelation(entity1Id, 'knows', entity2Id);
      await helpers.createRelation(entity2Id, 'reports_to', entity3Id);
      
      await helpers.verifyRelationCount(2);
      await helpers.verifyEdgeCount(2);
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
      await helpers.createRelation(entity1Id, 'references', entity1Id);
      
      await expect(page.getByTestId('relation-error')).toContainText('cannot reference itself');
      await helpers.verifyRelationCount(0);
    });
  });

  test.describe('Relation Display and Selection', () => {
    test('should display relation details when clicked in list', async ({ page }) => {
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await page.locator('[data-test="relation-item"]').first().click();
      
      const infoPanel = await helpers.verifyInfoPanelVisible();
      await expect(infoPanel).toContainText('Relation');
      await expect(infoPanel).toContainText('ID:');
      await expect(infoPanel).toContainText('Predicate: knows');
      await expect(infoPanel).toContainText('Subject:');
      await expect(infoPanel).toContainText('Object:');
    });

    test('should display relation details when edge clicked in graph', async ({ page }) => {
      await dbUtils.createTestRelation(entity1Id, 'works_with', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await page.locator('.react-flow__edge').first().click();
      
      const infoPanel = await helpers.verifyInfoPanelVisible();
      await expect(infoPanel).toContainText('Relation');
      await expect(infoPanel).toContainText('Predicate: works_with');
    });

    test('should highlight connected entities when relation selected', async ({ page }) => {
      await dbUtils.createTestRelation(entity1Id, 'manages', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await page.locator('[data-test="relation-item"]').first().click();
      
      const nodes = page.locator('.react-flow__node');
      await expect(nodes.first()).toHaveClass(/selected|highlighted/);
      await expect(nodes.nth(1)).toHaveClass(/selected|highlighted/);
    });
  });

  test.describe('Relation Deletion', () => {
    test('should delete relation successfully', async ({ page }) => {
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await helpers.verifyRelationCount(1);
      await helpers.verifyEdgeCount(1);
      
      await helpers.deleteRelation(relationId);
      
      await helpers.verifyRelationCount(0);
      await helpers.verifyEdgeCount(0);
      await expect(page.locator('[data-test="entity-item"]')).toHaveCount(3);
    });

    test('should handle cascading deletions correctly', async ({ page }) => {
      const relation1Id = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      const relation2Id = await dbUtils.createTestRelation(entity2Id, 'reports_to', entity3Id);
      const metaRelationId = await dbUtils.createTestMetaRelation(relation1Id, 'implies', relation2Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await helpers.verifyRelationCount(3);
      await helpers.deleteRelation(relation1Id);
      await helpers.verifyRelationCount(1);
      await helpers.verifyRelationText(0, 'reports_to');
    });
  });

  test.describe('Relation Update', () => {
    test('should update relation predicate', async ({ page }) => {
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await helpers.editRelation(relationId);
      await page.getByTestId('relation-predicate-input').fill('manages');
      await helpers.saveRelation();
      
      await helpers.verifyRelationText(0, '→ manages →');
    });

    test('should update relation subject and object', async ({ page }) => {
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await helpers.editRelation(relationId);
      await page.getByTestId('relation-subject-select').selectOption(entity2Id);
      await page.getByTestId('relation-object-select').selectOption(entity3Id);
      await helpers.saveRelation();
      
      await helpers.verifyEdgeCount(1);
    });
  });

  test.describe('Relation List Features', () => {
    test('should filter relations by predicate', async ({ page }) => {
      await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await dbUtils.createTestRelation(entity2Id, 'manages', entity3Id);
      await dbUtils.createTestRelation(entity1Id, 'works_with', entity3Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await helpers.verifyRelationCount(3);
      await page.getByTestId('predicate-filter').fill('knows');
      await helpers.verifyRelationCount(1);
      await helpers.verifyRelationText(0, 'knows');
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
      await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      await dbUtils.createTestRelation(entity1Id, 'manages', entity3Id);
      await dbUtils.createTestRelation(entity2Id, 'reports_to', entity3Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await page.getByTestId('group-by-subject').click();
      
      const groups = page.locator('[data-test="relation-group"]');
      await expect(groups).toHaveCount(2);
      await expect(groups.first().locator('[data-test="relation-item"]')).toHaveCount(2);
    });
  });

  test.describe('Complex Relation Scenarios', () => {
    test('should create meta-relation between two relations', async ({ page }) => {
      const relation1Id = await dbUtils.createTestRelation(entity1Id, 'trusts', entity2Id);
      const relation2Id = await dbUtils.createTestRelation(entity2Id, 'betrays', entity3Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await helpers.createMetaRelation(relation1Id, 'relation', 'contradicts', relation2Id, 'relation');
      
      await helpers.verifyRelationCount(3);
      const metaRelation = page.locator('[data-test="relation-item"]').last();
      await expect(metaRelation).toContainText('R:');
      await expect(metaRelation).toContainText('contradicts');
    });

    test('should create relation between entity and relation', async ({ page }) => {
      const relationId = await dbUtils.createTestRelation(entity1Id, 'knows', entity2Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await helpers.createMetaRelation(entity3Id, 'entity', 'witnesses', relationId, 'relation');
      
      await helpers.verifyRelationCount(2);
      const mixedRelation = page.locator('[data-test="relation-item"]').last();
      await expect(mixedRelation).toContainText('E:');
      await expect(mixedRelation).toContainText('R:');
      await expect(mixedRelation).toContainText('witnesses');
    });

    test('should visualize meta-relations in the graph', async ({ page }) => {
      const relation1Id = await dbUtils.createTestRelation(entity1Id, 'collaborates', entity2Id);
      const relation2Id = await dbUtils.createTestRelation(entity2Id, 'competes', entity3Id);
      await dbUtils.createTestMetaRelation(relation1Id, 'conflicts_with', relation2Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const relationNodes = page.locator('.react-flow__node[style*="border: 2px dashed"]');
      await expect(relationNodes).toHaveCount(2);
      
      const metaEdge = page.locator('.react-flow__edge[style*="stroke-dasharray"]');
      await expect(metaEdge).toBeVisible();
    });

    test('should select relation node in graph', async ({ page }) => {
      const relation1Id = await dbUtils.createTestRelation(entity1Id, 'manages', entity2Id);
      const relation2Id = await dbUtils.createTestRelation(entity2Id, 'reports_to', entity3Id);
      await dbUtils.createTestMetaRelation(relation1Id, 'implies', relation2Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const relationNode = page.locator('.react-flow__node').filter({ hasText: 'manages' });
      await relationNode.click();
      
      const infoPanel = await helpers.verifyInfoPanelVisible();
      await expect(infoPanel).toContainText('Selected Relation');
      await expect(infoPanel).toContainText('Predicate: manages');
      await expect(infoPanel).toContainText('Subject: Entity:');
      await expect(infoPanel).toContainText('Object: Entity:');
    });

    test('should visualize transitive relations', async ({ page }) => {
      const entity4Id = await dbUtils.createTestEntity({ facial: true, text: true });
      
      await dbUtils.createTestRelation(entity1Id, 'parent_of', entity2Id);
      await dbUtils.createTestRelation(entity2Id, 'parent_of', entity3Id);
      await dbUtils.createTestRelation(entity3Id, 'parent_of', entity4Id);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await page.getByTestId('show-transitive').click();
      
      await expect(page.locator('.react-flow__edge--transitive')).toBeVisible();
      const transitiveEdges = page.locator('.react-flow__edge--transitive');
      await expect(transitiveEdges).toHaveCount(3);
    });
  });
});