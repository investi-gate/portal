import { test, expect } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

test.describe('AI Analysis Features', () => {
  let dbUtils: TestDatabaseUtils;
  let testEntities: string[] = [];
  let testRelations: string[] = [];

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    // Clean database and create complex test network
    await dbUtils.cleanDatabase();
    
    // Create a network of entities to analyze
    // Hub entity with many connections
    const hubEntity = await dbUtils.createTestEntity({ facial: true, text: true });
    
    // Spoke entities
    const spokeEntities = [];
    for (let i = 0; i < 5; i++) {
      spokeEntities.push(await dbUtils.createTestEntity({ 
        facial: i % 2 === 0, 
        text: i % 2 === 1 
      }));
    }
    
    // Create hub connections
    for (const spoke of spokeEntities) {
      await dbUtils.createTestRelation(hubEntity, 'connected_to', spoke);
    }
    
    // Create a separate cluster
    const clusterEntities = [];
    for (let i = 0; i < 4; i++) {
      clusterEntities.push(await dbUtils.createTestEntity({ 
        facial: true, 
        text: false 
      }));
    }
    
    // Create dense connections within cluster
    for (let i = 0; i < clusterEntities.length; i++) {
      for (let j = i + 1; j < clusterEntities.length; j++) {
        await dbUtils.createTestRelation(clusterEntities[i], 'collaborates_with', clusterEntities[j]);
      }
    }
    
    // Create some isolated entities
    for (let i = 0; i < 3; i++) {
      await dbUtils.createTestEntity({ facial: false, text: true });
    }
    
    testEntities = [hubEntity, ...spokeEntities, ...clusterEntities];
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure AI sidebar is visible
    const aiSidebar = page.getByTestId('ai-sidebar');
    if (!(await aiSidebar.isVisible())) {
      await page.getByTestId('toggle-ai-sidebar').click();
      await expect(aiSidebar).toBeVisible();
    }
  });

  test.afterAll(async () => {
    await dbUtils.close();
  });

  test.describe('Importance Analysis', () => {
    test('should display entity importance rankings', async ({ page }) => {
      // Navigate to importance analysis tab
      await page.getByTestId('ai-importance-tab').click();
      
      // Trigger analysis
      await page.getByTestId('run-importance-analysis').click();
      
      // Wait for analysis to complete
      await expect(page.getByTestId('analysis-loading')).toBeVisible();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify importance results are displayed
      const importanceList = page.locator('[data-test="importance-item"]');
      await expect(importanceList).toBeVisible();
      
      // Hub entity should be ranked first
      const topEntity = importanceList.first();
      await expect(topEntity).toContainText('Importance Score:');
      await expect(topEntity.getByTestId('importance-score')).toBeVisible();
      
      // Verify scores are in descending order
      const scores = await importanceList.locator('[data-test="importance-score"]').allTextContents();
      const numericScores = scores.map(s => parseFloat(s));
      for (let i = 1; i < numericScores.length; i++) {
        expect(numericScores[i-1]).toBeGreaterThanOrEqual(numericScores[i]);
      }
    });

    test('should update graph visualization based on importance', async ({ page }) => {
      // Run importance analysis
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Enable importance-based visualization
      await page.getByTestId('apply-importance-visualization').click();
      
      // Verify nodes are sized based on importance
      const nodes = page.locator('.react-flow__node');
      const firstNode = nodes.first();
      const lastNode = nodes.last();
      
      // Get computed styles
      const firstNodeSize = await firstNode.evaluate(el => {
        const style = window.getComputedStyle(el);
        return parseInt(style.width);
      });
      
      const lastNodeSize = await lastNode.evaluate(el => {
        const style = window.getComputedStyle(el);
        return parseInt(style.width);
      });
      
      // More important nodes should be larger
      expect(firstNodeSize).toBeGreaterThan(lastNodeSize);
    });

    test('should highlight entity when clicked in importance list', async ({ page }) => {
      // Run importance analysis
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      // Run importance analysis
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      // Navigate to pattern detection tab
      await page.getByTestId('ai-patterns-tab').click();
      
      // Run pattern detection
      await page.getByTestId('run-pattern-detection').click();
      
      // Wait for analysis
      await expect(page.getByTestId('analysis-loading')).toBeVisible();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      // Run pattern detection
      await page.getByTestId('ai-patterns-tab').click();
      await page.getByTestId('run-pattern-detection').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      // Run pattern detection
      await page.getByTestId('ai-patterns-tab').click();
      await page.getByTestId('run-pattern-detection').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Apply filter
      await page.getByTestId('pattern-type-filter').selectOption('triangular');
      
      // Verify filtered results
      const patternItems = page.locator('[data-test="pattern-item"]');
      const count = await patternItems.count();
      
      // All visible patterns should be triangular type
      for (let i = 0; i < count; i++) {
        await expect(patternItems.nth(i)).toContainText('triangular');
      }
    });

    test('should show pattern statistics', async ({ page }) => {
      // Run pattern detection
      await page.getByTestId('ai-patterns-tab').click();
      await page.getByTestId('run-pattern-detection').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      // Navigate to cluster detection tab
      await page.getByTestId('ai-clusters-tab').click();
      
      // Run cluster detection
      await page.getByTestId('run-cluster-detection').click();
      
      // Wait for analysis
      await expect(page.getByTestId('analysis-loading')).toBeVisible();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      // Run cluster detection
      await page.getByTestId('ai-clusters-tab').click();
      await page.getByTestId('run-cluster-detection').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Click on a cluster to visualize
      const clusterItem = page.locator('[data-test="cluster-item"]').first();
      await clusterItem.getByTestId('visualize-cluster').click();
      
      // Verify cluster members are highlighted
      await expect(page.locator('.react-flow__node.cluster-member')).toBeVisible();
      
      // Verify cluster boundary visualization
      await expect(page.getByTestId('cluster-boundary')).toBeVisible();
    });

    test('should show cluster relationships', async ({ page }) => {
      // Run cluster detection
      await page.getByTestId('ai-clusters-tab').click();
      await page.getByTestId('run-cluster-detection').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Expand cluster details
      const clusterItem = page.locator('[data-test="cluster-item"]').first();
      await clusterItem.getByTestId('expand-cluster-details').click();
      
      // Verify inter-cluster relationships are shown
      await expect(page.getByTestId('cluster-relationships')).toBeVisible();
      await expect(page.getByTestId('cluster-relationships')).toContainText('Internal Connections:');
      await expect(page.getByTestId('cluster-relationships')).toContainText('External Connections:');
    });

    test('should merge clusters', async ({ page }) => {
      // Run cluster detection
      await page.getByTestId('ai-clusters-tab').click();
      await page.getByTestId('run-cluster-detection').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Select multiple clusters
      const cluster1 = page.locator('[data-test="cluster-item"]').nth(0);
      const cluster2 = page.locator('[data-test="cluster-item"]').nth(1);
      
      await cluster1.getByTestId('select-cluster').click();
      await cluster2.getByTestId('select-cluster').click();
      
      // Merge clusters
      await page.getByTestId('merge-clusters-button').click();
      await page.getByTestId('confirm-merge').click();
      
      // Verify clusters are merged
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 5000 });
      const updatedClusters = page.locator('[data-test="cluster-item"]');
      const newCount = await updatedClusters.count();
      expect(newCount).toBeLessThan(3);
    });
  });

  test.describe('Relationship Suggestions', () => {
    test('should suggest potential relationships', async ({ page }) => {
      // Navigate to suggestions tab
      await page.getByTestId('ai-suggestions-tab').click();
      
      // Run relationship suggestion analysis
      await page.getByTestId('run-suggestion-analysis').click();
      
      // Wait for analysis
      await expect(page.getByTestId('analysis-loading')).toBeVisible();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      // Run suggestion analysis
      await page.getByTestId('ai-suggestions-tab').click();
      await page.getByTestId('run-suggestion-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Preview a suggestion
      const suggestionItem = page.locator('[data-test="suggestion-item"]').first();
      await suggestionItem.getByTestId('preview-suggestion').click();
      
      // Verify preview in graph
      await expect(page.locator('.react-flow__edge.suggested')).toBeVisible();
      await expect(page.locator('.react-flow__edge.suggested')).toHaveClass(/dashed/);
    });

    test('should apply suggested relationship', async ({ page }) => {
      // Run suggestion analysis
      await page.getByTestId('ai-suggestions-tab').click();
      await page.getByTestId('run-suggestion-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      // Run suggestion analysis
      await page.getByTestId('ai-suggestions-tab').click();
      await page.getByTestId('run-suggestion-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      // Run suggestion analysis
      await page.getByTestId('ai-suggestions-tab').click();
      await page.getByTestId('run-suggestion-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Select multiple suggestions
      const suggestions = page.locator('[data-test="suggestion-item"]');
      const suggestionCount = Math.min(3, await suggestions.count());
      
      for (let i = 0; i < suggestionCount; i++) {
        await suggestions.nth(i).getByTestId('select-suggestion').click();
      }
      
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
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Run cluster detection
      await page.getByTestId('ai-clusters-tab').click();
      await page.getByTestId('run-cluster-detection').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
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
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      await page.getByTestId('ai-patterns-tab').click();
      await page.getByTestId('run-pattern-detection').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      // Save session
      await page.getByTestId('save-analysis-session').click();
      await page.getByTestId('session-name-input').fill('Test Analysis Session');
      await page.getByTestId('confirm-save-session').click();
      
      // Verify session saved
      await expect(page.getByTestId('session-saved-notification')).toBeVisible();
      await expect(page.getByTestId('session-saved-notification')).toContainText('saved successfully');
    });

    test('should load saved analysis session', async ({ page }) => {
      // First save a session
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      await expect(page.getByTestId('analysis-loading')).toBeHidden({ timeout: 10000 });
      
      await page.getByTestId('save-analysis-session').click();
      await page.getByTestId('session-name-input').fill('Load Test Session');
      await page.getByTestId('confirm-save-session').click();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Ensure AI sidebar is visible
      const aiSidebar = page.getByTestId('ai-sidebar');
      if (!(await aiSidebar.isVisible())) {
        await page.getByTestId('toggle-ai-sidebar').click();
      }
      
      // Load session
      await page.getByTestId('load-analysis-session').click();
      await page.getByTestId('session-list-item').filter({ hasText: 'Load Test Session' }).click();
      await page.getByTestId('confirm-load-session').click();
      
      // Verify analysis results are restored
      await page.getByTestId('ai-importance-tab').click();
      await expect(page.locator('[data-test="importance-item"]')).toBeVisible();
    });
  });

  test.describe('Analysis Error Handling', () => {
    test('should handle analysis failure gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/ai/analyze', route => 
        route.fulfill({ status: 500, body: 'Analysis failed' })
      );
      
      // Try to run analysis
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      
      // Verify error message
      await expect(page.getByTestId('analysis-error')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('analysis-error')).toContainText('failed');
      
      // Verify retry option
      await expect(page.getByTestId('retry-analysis')).toBeVisible();
    });

    test('should handle empty graph analysis', async ({ page }) => {
      // Clean all data
      await dbUtils.cleanDatabase();
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Ensure AI sidebar is visible
      const aiSidebar = page.getByTestId('ai-sidebar');
      if (!(await aiSidebar.isVisible())) {
        await page.getByTestId('toggle-ai-sidebar').click();
      }
      
      // Try to run analysis on empty graph
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      
      // Verify appropriate message
      await expect(page.getByTestId('empty-graph-message')).toBeVisible();
      await expect(page.getByTestId('empty-graph-message')).toContainText('No data to analyze');
    });
  });
});