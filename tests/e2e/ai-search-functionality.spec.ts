import { test, expect } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

test.describe('AI Search Functionality', () => {
  let dbUtils: TestDatabaseUtils;
  let testEntities: string[] = [];
  let testRelations: string[] = [];

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    // Clean database and create test data
    await dbUtils.cleanDatabase();
    
    // Create diverse test entities
    testEntities = [
      await dbUtils.createTestEntity({ facial: true, text: false }),
      await dbUtils.createTestEntity({ facial: false, text: true }),
      await dbUtils.createTestEntity({ facial: true, text: true }),
      await dbUtils.createTestEntity({ facial: true, text: false }),
      await dbUtils.createTestEntity({ facial: false, text: true })
    ];
    
    // Create test relations with meaningful predicates
    testRelations = [
      await dbUtils.createTestRelation(testEntities[0], 'knows', testEntities[1]),
      await dbUtils.createTestRelation(testEntities[1], 'works_with', testEntities[2]),
      await dbUtils.createTestRelation(testEntities[2], 'manages', testEntities[3]),
      await dbUtils.createTestRelation(testEntities[3], 'reports_to', testEntities[0]),
      await dbUtils.createTestRelation(testEntities[0], 'collaborates_with', testEntities[4])
    ];
    
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

  test.describe('Basic Search Operations', () => {
    test('should perform search and display results', async ({ page }) => {
      // Click on the search tab
      await page.getByTestId('ai-search-tab').click();
      
      // Enter search query
      const searchInput = page.getByTestId('ai-search-input');
      await searchInput.fill('entities with facial data');
      
      // Submit search
      await page.getByTestId('ai-search-button').click();
      
      // Wait for search results
      await expect(page.getByTestId('search-loading')).toBeVisible();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify search results are displayed
      const searchResults = page.locator('[data-test="search-result-item"]');
      await expect(searchResults).toHaveCount(3); // 3 entities have facial data
      
      // Verify result format
      const firstResult = searchResults.first();
      await expect(firstResult).toContainText('Entity');
      await expect(firstResult).toContainText('👤'); // Facial indicator
    });

    test('should search for entities by data type', async ({ page }) => {
      // Search for text data entities
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('text documents');
      await page.getByTestId('ai-search-button').click();
      
      // Wait for results
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify only text entities are returned
      const searchResults = page.locator('[data-test="search-result-item"]');
      await expect(searchResults).toHaveCount(3); // 3 entities have text data
      
      // Verify all results have text indicator
      for (let i = 0; i < 3; i++) {
        await expect(searchResults.nth(i)).toContainText('📝');
      }
    });

    test('should search for relations by predicate', async ({ page }) => {
      // Search for specific relation type
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('who manages');
      await page.getByTestId('ai-search-button').click();
      
      // Wait for results
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify relation results
      const searchResults = page.locator('[data-test="search-result-item"]');
      await expect(searchResults).toBeVisible();
      await expect(searchResults.first()).toContainText('manages');
    });

    test('should handle empty search results', async ({ page }) => {
      // Search for non-existent content
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('quantum physics research papers');
      await page.getByTestId('ai-search-button').click();
      
      // Wait for search to complete
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify no results message
      await expect(page.getByTestId('search-no-results')).toBeVisible();
      await expect(page.getByTestId('search-no-results')).toContainText('No results found');
    });

    test('should clear search results', async ({ page }) => {
      // Perform a search
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('entities');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify results are shown
      await expect(page.locator('[data-test="search-result-item"]')).toHaveCount(5);
      
      // Clear search
      await page.getByTestId('clear-search-button').click();
      
      // Verify search input is cleared and results are hidden
      await expect(page.getByTestId('ai-search-input')).toHaveValue('');
      await expect(page.locator('[data-test="search-result-item"]')).toHaveCount(0);
    });
  });

  test.describe('Search Result Interactions', () => {
    test('should select entity from search results', async ({ page }) => {
      // Perform search
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('facial recognition');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Click on a search result
      const searchResult = page.locator('[data-test="search-result-item"]').first();
      await searchResult.click();
      
      // Verify entity is selected in the graph
      const selectedNode = page.locator('.react-flow__node.selected');
      await expect(selectedNode).toBeVisible();
      
      // Verify selected item info panel shows the entity
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Entity');
    });

    test('should highlight entity in graph when hovering search result', async ({ page }) => {
      // Perform search
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('entities');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Hover over a search result
      const searchResult = page.locator('[data-test="search-result-item"]').first();
      await searchResult.hover();
      
      // Verify corresponding node is highlighted
      const highlightedNode = page.locator('.react-flow__node.highlighted');
      await expect(highlightedNode).toBeVisible();
    });

    test('should navigate to entity when double-clicking search result', async ({ page }) => {
      // Perform search
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('all entities');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Double-click on a search result
      const searchResult = page.locator('[data-test="search-result-item"]').first();
      await searchResult.dblclick();
      
      // Verify graph centers on the entity
      // This would require checking the transform/viewport of the react-flow container
      await expect(page.locator('.react-flow__node.selected')).toBeInViewport();
    });
  });

  test.describe('Advanced Search Features', () => {
    test('should support natural language queries', async ({ page }) => {
      // Complex natural language query
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('find all people who work together and have facial data');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify relevant results are returned
      const searchResults = page.locator('[data-test="search-result-item"]');
      await expect(searchResults).toBeVisible();
      
      // Results should include entities with "works_with" relations and facial data
      const resultsText = await searchResults.allTextContents();
      expect(resultsText.some(text => text.includes('👤'))).toBeTruthy();
    });

    test('should search across entity relationships', async ({ page }) => {
      // Search for connected entities
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('entities connected to managers');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify results include entities with management relationships
      const searchResults = page.locator('[data-test="search-result-item"]');
      await expect(searchResults).toBeVisible();
    });

    test('should provide search suggestions', async ({ page }) => {
      // Start typing in search
      await page.getByTestId('ai-search-tab').click();
      const searchInput = page.getByTestId('ai-search-input');
      await searchInput.fill('ent');
      
      // Wait for suggestions
      await expect(page.getByTestId('search-suggestions')).toBeVisible();
      
      // Verify suggestions contain relevant options
      const suggestions = page.locator('[data-test="search-suggestion"]');
      await expect(suggestions).toHaveCount(3); // e.g., "entities", "entity types", "entity relationships"
      
      // Click on a suggestion
      await suggestions.first().click();
      
      // Verify search input is updated
      await expect(searchInput).toHaveValue('entities');
    });

    test('should save recent searches', async ({ page }) => {
      // Perform multiple searches
      const searches = ['facial data', 'text documents', 'management relations'];
      
      for (const query of searches) {
        await page.getByTestId('ai-search-tab').click();
        await page.getByTestId('ai-search-input').fill(query);
        await page.getByTestId('ai-search-button').click();
        await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
        await page.waitForTimeout(500);
      }
      
      // Clear current search
      await page.getByTestId('clear-search-button').click();
      
      // Click on search input to see recent searches
      await page.getByTestId('ai-search-input').click();
      
      // Verify recent searches dropdown
      await expect(page.getByTestId('recent-searches')).toBeVisible();
      
      // Verify all recent searches are listed
      const recentSearches = page.locator('[data-test="recent-search-item"]');
      await expect(recentSearches).toHaveCount(3);
      
      // Click on a recent search
      await recentSearches.first().click();
      
      // Verify search is executed
      await expect(page.getByTestId('ai-search-input')).toHaveValue(searches[2]); // Most recent first
    });
  });

  test.describe('Search Performance and Error Handling', () => {
    test('should handle search timeout gracefully', async ({ page }) => {
      // Mock a slow API response
      await page.route('**/api/ai/search*', async route => {
        await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
        await route.fulfill({ status: 408, body: 'Request Timeout' });
      });
      
      // Perform search
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('test query');
      await page.getByTestId('ai-search-button').click();
      
      // Verify timeout message
      await expect(page.getByTestId('search-error')).toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId('search-error')).toContainText('timeout');
    });

    test('should handle API errors', async ({ page }) => {
      // Mock API error
      await page.route('**/api/ai/search*', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      // Perform search
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('test query');
      await page.getByTestId('ai-search-button').click();
      
      // Verify error message
      await expect(page.getByTestId('search-error')).toBeVisible();
      await expect(page.getByTestId('search-error')).toContainText('error occurred');
      
      // Verify retry button
      await expect(page.getByTestId('retry-search-button')).toBeVisible();
    });

    test('should debounce search input', async ({ page }) => {
      // Track API calls
      let searchCallCount = 0;
      await page.route('**/api/ai/search*', route => {
        searchCallCount++;
        route.fulfill({ status: 200, body: JSON.stringify({ results: [] }) });
      });
      
      // Enable auto-search
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('auto-search-toggle').click();
      
      // Type quickly
      const searchInput = page.getByTestId('ai-search-input');
      await searchInput.type('test query with multiple words', { delay: 50 });
      
      // Wait for debounce
      await page.waitForTimeout(1000);
      
      // Verify only one API call was made
      expect(searchCallCount).toBe(1);
    });

    test('should cancel previous search when new search starts', async ({ page }) => {
      // Track API calls
      const apiCalls: string[] = [];
      await page.route('**/api/ai/search*', async route => {
        const url = new URL(route.request().url());
        const query = url.searchParams.get('q');
        apiCalls.push(query || '');
        
        // Simulate slow response
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.fulfill({ status: 200, body: JSON.stringify({ results: [] }) });
      });
      
      // Perform multiple searches quickly
      await page.getByTestId('ai-search-tab').click();
      
      await page.getByTestId('ai-search-input').fill('first query');
      await page.getByTestId('ai-search-button').click();
      
      await page.waitForTimeout(500);
      
      await page.getByTestId('ai-search-input').fill('second query');
      await page.getByTestId('ai-search-button').click();
      
      // Wait for searches to complete
      await page.waitForTimeout(3000);
      
      // Verify both searches were initiated
      expect(apiCalls).toContain('first query');
      expect(apiCalls).toContain('second query');
      
      // Verify UI shows results for the latest search only
      await expect(page.getByTestId('search-query-display')).toContainText('second query');
    });
  });

  test.describe('Search Filters and Options', () => {
    test('should filter search by entity type', async ({ page }) => {
      await page.getByTestId('ai-search-tab').click();
      
      // Enable entity type filter
      await page.getByTestId('search-filter-button').click();
      await page.getByTestId('filter-facial-only').check();
      
      // Perform search
      await page.getByTestId('ai-search-input').fill('all entities');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify only facial entities are returned
      const searchResults = page.locator('[data-test="search-result-item"]');
      await expect(searchResults).toHaveCount(3);
      
      // All results should have facial indicator
      for (let i = 0; i < 3; i++) {
        await expect(searchResults.nth(i)).toContainText('👤');
      }
    });

    test('should search with case sensitivity option', async ({ page }) => {
      await page.getByTestId('ai-search-tab').click();
      
      // Enable case-sensitive search
      await page.getByTestId('search-options-button').click();
      await page.getByTestId('case-sensitive-toggle').click();
      
      // Search with specific case
      await page.getByTestId('ai-search-input').fill('MANAGES');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify case-sensitive results
      const searchResults = page.locator('[data-test="search-result-item"]');
      const resultsCount = await searchResults.count();
      
      // Now search with different case
      await page.getByTestId('ai-search-input').fill('manages');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Results should be different when case-sensitive
      const newResultsCount = await page.locator('[data-test="search-result-item"]').count();
      expect(resultsCount).not.toBe(newResultsCount);
    });

    test('should export search results', async ({ page }) => {
      // Perform search
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('all data');
      await page.getByTestId('ai-search-button').click();
      await expect(page.getByTestId('search-loading')).toBeHidden({ timeout: 10000 });
      
      // Verify export button is available
      await expect(page.getByTestId('export-search-results')).toBeVisible();
      
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      
      // Click export
      await page.getByTestId('export-search-results').click();
      
      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('search-results');
      expect(download.suggestedFilename()).toMatch(/\.(json|csv)$/);
    });
  });
});