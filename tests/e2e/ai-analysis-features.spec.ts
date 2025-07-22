import { test, expect, Page } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

// Helper functions for AI analysis operations
class AIAnalysisHelpers {
  constructor(private page: Page) {}

  async ensureAISidebarVisible() {
    const aiSidebar = this.page.getByTestId('ai-sidebar');
    if (!(await aiSidebar.isVisible())) {
      await this.page.getByTestId('toggle-ai-sidebar').click();
      await expect(aiSidebar).toBeVisible();
    }
  }

  async runAnalysis(tabId: string, buttonId: string, timeout = 10000) {
    await this.page.getByTestId(tabId).click();
    await this.page.getByTestId(buttonId).click();
    await this.waitForAnalysisComplete(timeout);
  }

  async waitForAnalysisComplete(timeout = 10000) {
    await expect(this.page.getByTestId('analysis-loading')).toBeVisible();
    await expect(this.page.getByTestId('analysis-loading')).toBeHidden({ timeout });
  }

  async verifyItemsInDescendingOrder(selector: string, scoreSelector: string) {
    const scores = await this.page.locator(selector).locator(scoreSelector).allTextContents();
    const numericScores = scores.map(s => parseFloat(s));
    for (let i = 1; i < numericScores.length; i++) {
      expect(numericScores[i-1]).toBeGreaterThanOrEqual(numericScores[i]);
    }
  }

  async selectMultipleItems(itemSelector: string, selectButtonSelector: string, count: number) {
    const items = this.page.locator(itemSelector);
    const itemCount = Math.min(count, await items.count());
    
    for (let i = 0; i < itemCount; i++) {
      await items.nth(i).getByTestId(selectButtonSelector).click();
    }
    
    return itemCount;
  }

  async verifyFilteredItems(itemSelector: string, expectedText: string) {
    const items = this.page.locator(itemSelector);
    const count = await items.count();
    
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).toContainText(expectedText);
    }
  }

  async saveAnalysisSession(sessionName: string) {
    await this.page.getByTestId('save-analysis-session').click();
    await this.page.getByTestId('session-name-input').fill(sessionName);
    await this.page.getByTestId('confirm-save-session').click();
    await expect(this.page.getByTestId('session-saved-notification')).toBeVisible();
    await expect(this.page.getByTestId('session-saved-notification')).toContainText('saved successfully');
  }

  async loadAnalysisSession(sessionName: string) {
    await this.page.getByTestId('load-analysis-session').click();
    await this.page.getByTestId('session-list-item').filter({ hasText: sessionName }).click();
    await this.page.getByTestId('confirm-load-session').click();
  }

  async mockAPIError(url: string, status = 500, body = 'Analysis failed') {
    await this.page.route(url, route => 
      route.fulfill({ status, body })
    );
  }

  async verifyErrorHandling() {
    await expect(this.page.getByTestId('analysis-error')).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByTestId('analysis-error')).toContainText('failed');
    await expect(this.page.getByTestId('retry-analysis')).toBeVisible();
  }

  async verifyEmptyGraphMessage() {
    await expect(this.page.getByTestId('empty-graph-message')).toBeVisible();
    await expect(this.page.getByTestId('empty-graph-message')).toContainText('No data to analyze');
  }
}

// Test data setup helpers
class TestDataSetup {
  constructor(private dbUtils: TestDatabaseUtils) {}

  async createComplexNetwork() {
    const entities: string[] = [];
    
    // Create hub entity with many connections
    const hubEntity = await this.dbUtils.createTestEntity({ facial: true, text: true });
    entities.push(hubEntity);
    
    // Create spoke entities
    const spokeEntities = await this.createSpokeEntities(5);
    entities.push(...spokeEntities);
    
    // Create hub connections
    await this.connectEntitiesToHub(hubEntity, spokeEntities);
    
    // Create a separate cluster
    const clusterEntities = await this.createClusterEntities(4);
    entities.push(...clusterEntities);
    
    // Create dense connections within cluster
    await this.createDenseClusterConnections(clusterEntities);
    
    // Create isolated entities
    await this.createIsolatedEntities(3);
    
    return entities;
  }

  private async createSpokeEntities(count: number) {
    const entities = [];
    for (let i = 0; i < count; i++) {
      entities.push(await this.dbUtils.createTestEntity({ 
        facial: i % 2 === 0, 
        text: i % 2 === 1 
      }));
    }
    return entities;
  }

  private async connectEntitiesToHub(hub: string, spokes: string[]) {
    for (const spoke of spokes) {
      await this.dbUtils.createTestRelation(hub, 'connected_to', spoke);
    }
  }

  private async createClusterEntities(count: number) {
    const entities = [];
    for (let i = 0; i < count; i++) {
      entities.push(await this.dbUtils.createTestEntity({ 
        facial: true, 
        text: false 
      }));
    }
    return entities;
  }

  private async createDenseClusterConnections(entities: string[]) {
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        await this.dbUtils.createTestRelation(entities[i], 'collaborates_with', entities[j]);
      }
    }
  }

  private async createIsolatedEntities(count: number) {
    for (let i = 0; i < count; i++) {
      await this.dbUtils.createTestEntity({ facial: false, text: true });
    }
  }
}

test.describe('AI Analysis Features', () => {
  let dbUtils: TestDatabaseUtils;
  let aiHelpers: AIAnalysisHelpers;
  let testDataSetup: TestDataSetup;
  let testEntities: string[] = [];

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    aiHelpers = new AIAnalysisHelpers(page);
    testDataSetup = new TestDataSetup(dbUtils);
    
    // Clean database and create complex test network
    await dbUtils.cleanDatabase();
    testEntities = await testDataSetup.createComplexNetwork();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await aiHelpers.ensureAISidebarVisible();
  });

  test.afterAll(async () => {
    await dbUtils.close();
  });

  test.describe('Importance Analysis', () => {
    test('should display entity importance rankings', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-importance-tab', 'run-importance-analysis');
      
      // Verify importance results are displayed
      const importanceList = page.locator('[data-test="importance-item"]');
      await expect(importanceList).toBeVisible();
      
      // Hub entity should be ranked first
      const topEntity = importanceList.first();
      await expect(topEntity).toContainText('Importance Score:');
      await expect(topEntity.getByTestId('importance-score')).toBeVisible();
      
      // Verify scores are in descending order
      await aiHelpers.verifyItemsInDescendingOrder('[data-test="importance-item"]', '[data-test="importance-score"]');
    });

    test('should update graph visualization based on importance', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-importance-tab', 'run-importance-analysis');
      
      // Enable importance-based visualization
      await page.getByTestId('apply-importance-visualization').click();
      
      // Verify nodes are sized based on importance
      const nodes = page.locator('.react-flow__node');
      const getNodeSize = async (node: any) => {
        return await node.evaluate((el: HTMLElement) => {
          const style = window.getComputedStyle(el);
          return parseInt(style.width);
        });
      };
      
      const firstNodeSize = await getNodeSize(nodes.first());
      const lastNodeSize = await getNodeSize(nodes.last());
      
      // More important nodes should be larger
      expect(firstNodeSize).toBeGreaterThan(lastNodeSize);
    });

    test('should highlight entity when clicked in importance list', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-importance-tab', 'run-importance-analysis');
      
      // Click on an entity in the importance list
      const importanceItem = page.locator('[data-test="importance-item"]').first();
      await importanceItem.click();
      
      // Verify entity is selected in graph
      await expect(page.locator('.react-flow__node.selected')).toBeVisible();
      
      // Verify selected item info shows the entity
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Entity');
    });

    test('should export importance analysis results', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-importance-tab', 'run-importance-analysis');
      
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      
      // Export results
      await page.getByTestId('export-importance-analysis').click();
      
      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('importance-analysis');
      expect(download.suggestedFilename()).toMatch(/\.(json|csv)$/);
    });
  });

  test.describe('Pattern Detection', () => {
    test('should identify common relationship patterns', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-patterns-tab', 'run-pattern-detection');
      
      // Verify patterns are displayed
      const patternList = page.locator('[data-test="pattern-item"]');
      await expect(patternList).toBeVisible();
      
      // Verify pattern details
      const firstPattern = patternList.first();
      await expect(firstPattern).toContainText('Pattern:');
      await expect(firstPattern.getByTestId('pattern-frequency')).toBeVisible();
      await expect(firstPattern.getByTestId('pattern-confidence')).toBeVisible();
    });

    test('should visualize pattern instances', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-patterns-tab', 'run-pattern-detection');
      
      // Click on a pattern to visualize
      const patternItem = page.locator('[data-test="pattern-item"]').first();
      await patternItem.getByTestId('visualize-pattern').click();
      
      // Verify pattern instances are highlighted in graph
      await expect(page.locator('.react-flow__edge.pattern-highlighted')).toBeVisible();
      await expect(page.locator('.react-flow__node.pattern-highlighted')).toBeVisible();
      
      // Verify pattern info panel
      await expect(page.getByTestId('pattern-visualization-info')).toBeVisible();
    });

    test('should filter patterns by type', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-patterns-tab', 'run-pattern-detection');
      
      // Apply filter
      await page.getByTestId('pattern-type-filter').selectOption('triangular');
      
      // Verify filtered results
      await aiHelpers.verifyFilteredItems('[data-test="pattern-item"]', 'triangular');
    });

    test('should show pattern statistics', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-patterns-tab', 'run-pattern-detection');
      
      // Verify statistics panel
      const statsPanel = page.getByTestId('pattern-statistics');
      await expect(statsPanel).toBeVisible();
      await expect(statsPanel).toContainText('Total Patterns:');
      await expect(statsPanel).toContainText('Most Common:');
      await expect(statsPanel).toContainText('Average Frequency:');
    });
  });

  test.describe('Cluster Detection', () => {
    test('should identify entity clusters', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-clusters-tab', 'run-cluster-detection');
      
      // Verify clusters are displayed
      const clusterList = page.locator('[data-test="cluster-item"]');
      await expect(clusterList).toBeVisible();
      await expect(clusterList).toHaveCount(3); // Hub cluster, dense cluster, isolated entities
      
      // Verify cluster details
      const firstCluster = clusterList.first();
      await expect(firstCluster).toContainText('Cluster');
      await expect(firstCluster.getByTestId('cluster-size')).toBeVisible();
      await expect(firstCluster.getByTestId('cluster-density')).toBeVisible();
    });

    test('should visualize cluster members', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-clusters-tab', 'run-cluster-detection');
      
      // Click on a cluster to visualize
      const clusterItem = page.locator('[data-test="cluster-item"]').first();
      await clusterItem.getByTestId('visualize-cluster').click();
      
      // Verify cluster members are highlighted
      await expect(page.locator('.react-flow__node.cluster-member')).toBeVisible();
      
      // Verify cluster boundary visualization
      await expect(page.getByTestId('cluster-boundary')).toBeVisible();
    });

    test('should show cluster relationships', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-clusters-tab', 'run-cluster-detection');
      
      // Expand cluster details
      const clusterItem = page.locator('[data-test="cluster-item"]').first();
      await clusterItem.getByTestId('expand-cluster-details').click();
      
      // Verify inter-cluster relationships are shown
      await expect(page.getByTestId('cluster-relationships')).toBeVisible();
      await expect(page.getByTestId('cluster-relationships')).toContainText('Internal Connections:');
      await expect(page.getByTestId('cluster-relationships')).toContainText('External Connections:');
    });

    test('should merge clusters', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-clusters-tab', 'run-cluster-detection');
      
      // Select multiple clusters
      await aiHelpers.selectMultipleItems('[data-test="cluster-item"]', 'select-cluster', 2);
      
      // Merge clusters
      await page.getByTestId('merge-clusters-button').click();
      await page.getByTestId('confirm-merge').click();
      
      // Verify clusters are merged
      await aiHelpers.waitForAnalysisComplete(5000);
      const updatedClusters = page.locator('[data-test="cluster-item"]');
      const newCount = await updatedClusters.count();
      expect(newCount).toBeLessThan(3);
    });
  });

  test.describe('Relationship Suggestions', () => {
    test('should suggest potential relationships', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-suggestions-tab', 'run-suggestion-analysis');
      
      // Verify suggestions are displayed
      const suggestionList = page.locator('[data-test="suggestion-item"]');
      await expect(suggestionList).toBeVisible();
      
      // Verify suggestion details
      const firstSuggestion = suggestionList.first();
      await expect(firstSuggestion).toContainText('Suggested Relation:');
      await expect(firstSuggestion.getByTestId('suggestion-confidence')).toBeVisible();
      await expect(firstSuggestion.getByTestId('suggestion-reason')).toBeVisible();
    });

    test('should preview suggested relationship', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-suggestions-tab', 'run-suggestion-analysis');
      
      // Preview a suggestion
      const suggestionItem = page.locator('[data-test="suggestion-item"]').first();
      await suggestionItem.getByTestId('preview-suggestion').click();
      
      // Verify preview in graph
      await expect(page.locator('.react-flow__edge.suggested')).toBeVisible();
      await expect(page.locator('.react-flow__edge.suggested')).toHaveClass(/dashed/);
    });

    test('should apply suggested relationship', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-suggestions-tab', 'run-suggestion-analysis');
      
      // Get initial relation count
      const initialRelationCount = await page.locator('[data-test="relation-item"]').count();
      
      // Apply a suggestion
      const suggestionItem = page.locator('[data-test="suggestion-item"]').first();
      await suggestionItem.getByTestId('apply-suggestion').click();
      
      // Confirm application
      await page.getByTestId('confirm-apply-suggestion').click();
      
      // Verify relation is created
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(initialRelationCount + 1);
      
      // Verify suggestion is removed from list
      await expect(suggestionItem).toBeHidden();
    });

    test('should filter suggestions by confidence', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-suggestions-tab', 'run-suggestion-analysis');
      
      // Set confidence threshold
      await page.getByTestId('confidence-threshold-slider').fill('80');
      
      // Verify only high-confidence suggestions are shown
      const suggestions = page.locator('[data-test="suggestion-item"]');
      const count = await suggestions.count();
      
      for (let i = 0; i < count; i++) {
        const confidenceText = await suggestions.nth(i).getByTestId('suggestion-confidence').textContent();
        const confidence = parseFloat(confidenceText || '0');
        expect(confidence).toBeGreaterThanOrEqual(80);
      }
    });

    test('should bulk apply suggestions', async ({ page }) => {
      await aiHelpers.runAnalysis('ai-suggestions-tab', 'run-suggestion-analysis');
      
      // Select multiple suggestions
      const suggestionCount = await aiHelpers.selectMultipleItems(
        '[data-test="suggestion-item"]', 
        'select-suggestion', 
        3
      );
      
      // Get initial relation count
      const initialRelationCount = await page.locator('[data-test="relation-item"]').count();
      
      // Bulk apply
      await page.getByTestId('bulk-apply-suggestions').click();
      await page.getByTestId('confirm-bulk-apply').click();
      
      // Verify relations are created
      await expect(page.locator('[data-test="relation-item"]')).toHaveCount(initialRelationCount + suggestionCount);
    });
  });

  test.describe('Analysis Integration', () => {
    test('should combine multiple analyses', async ({ page }) => {
      // Run importance analysis
      await aiHelpers.runAnalysis('ai-importance-tab', 'run-importance-analysis');
      
      // Run cluster detection
      await aiHelpers.runAnalysis('ai-clusters-tab', 'run-cluster-detection');
      
      // Enable combined visualization
      await page.getByTestId('combine-analyses-button').click();
      await page.getByTestId('select-importance').click();
      await page.getByTestId('select-clusters').click();
      await page.getByTestId('apply-combined-visualization').click();
      
      // Verify combined visualization
      await expect(page.locator('.react-flow__node.cluster-member')).toBeVisible();
      await expect(page.locator('.react-flow__node[style*="width"]')).toBeVisible(); // Size from importance
    });

    test('should save analysis session', async ({ page }) => {
      // Run multiple analyses
      await aiHelpers.runAnalysis('ai-importance-tab', 'run-importance-analysis');
      await aiHelpers.runAnalysis('ai-patterns-tab', 'run-pattern-detection');
      
      // Save session
      await aiHelpers.saveAnalysisSession('Test Analysis Session');
    });

    test('should load saved analysis session', async ({ page }) => {
      // First save a session
      await aiHelpers.runAnalysis('ai-importance-tab', 'run-importance-analysis');
      await aiHelpers.saveAnalysisSession('Load Test Session');
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await aiHelpers.ensureAISidebarVisible();
      
      // Load session
      await aiHelpers.loadAnalysisSession('Load Test Session');
      
      // Verify analysis results are restored
      await page.getByTestId('ai-importance-tab').click();
      await expect(page.locator('[data-test="importance-item"]')).toBeVisible();
    });
  });

  test.describe('Analysis Error Handling', () => {
    test('should handle analysis failure gracefully', async ({ page }) => {
      // Mock API error
      await aiHelpers.mockAPIError('**/api/ai/analyze');
      
      // Try to run analysis
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      
      // Verify error handling
      await aiHelpers.verifyErrorHandling();
    });

    test('should handle empty graph analysis', async ({ page }) => {
      // Clean all data
      await dbUtils.cleanDatabase();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await aiHelpers.ensureAISidebarVisible();
      
      // Try to run analysis on empty graph
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      
      // Verify appropriate message
      await aiHelpers.verifyEmptyGraphMessage();
    });
  });
});