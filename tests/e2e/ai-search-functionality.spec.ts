import { test, expect, Page } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

// Helper functions for common search operations
class SearchHelpers {
  constructor(private page: Page) {}

  async performSearch(query: string) {
    await this.page.getByTestId('ai-search-tab').click();
    await this.page.getByTestId('ai-search-input').fill(query);
    await this.page.getByTestId('ai-search-button').click();
    await this.waitForSearchCompletion();
  }

  async waitForSearchCompletion(timeout = 10000) {
    await expect(this.page.getByTestId('search-loading')).toBeVisible();
    await expect(this.page.getByTestId('search-loading')).toBeHidden({ timeout });
  }

  async clearSearch() {
    await this.page.getByTestId('clear-search-button').click();
  }

  async getSearchResults() {
    return this.page.locator('[data-test="search-result-item"]');
  }

  async verifyResultCount(expectedCount: number) {
    const results = await this.getSearchResults();
    await expect(results).toHaveCount(expectedCount);
  }

  async verifyAllResultsContain(text: string) {
    const results = await this.getSearchResults();
    const count = await results.count();
    for (let i = 0; i < count; i++) {
      await expect(results.nth(i)).toContainText(text);
    }
  }

  async ensureAiSidebarVisible() {
    const aiSidebar = this.page.getByTestId('ai-sidebar');
    if (!(await aiSidebar.isVisible())) {
      await this.page.getByTestId('toggle-ai-sidebar').click();
      await expect(aiSidebar).toBeVisible();
    }
  }

  async mockApiResponse(response: any, status = 200, delay = 0) {
    await this.page.route('**/api/ai/search*', async route => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      await route.fulfill({ status, body: JSON.stringify(response) });
    });
  }

  async mockApiError(status: number, message: string) {
    await this.page.route('**/api/ai/search*', route => 
      route.fulfill({ status, body: message })
    );
  }
}

// Test data setup helpers
class TestDataHelpers {
  constructor(private dbUtils: TestDatabaseUtils) {}

  async createStandardTestEntities() {
    return [
      await this.dbUtils.createTestEntity({ facial: true, text: false }),
      await this.dbUtils.createTestEntity({ facial: false, text: true }),
      await this.dbUtils.createTestEntity({ facial: true, text: true }),
      await this.dbUtils.createTestEntity({ facial: true, text: false }),
      await this.dbUtils.createTestEntity({ facial: false, text: true })
    ];
  }

  async createStandardTestRelations(entities: string[]) {
    return [
      await this.dbUtils.createTestRelation(entities[0], 'knows', entities[1]),
      await this.dbUtils.createTestRelation(entities[1], 'works_with', entities[2]),
      await this.dbUtils.createTestRelation(entities[2], 'manages', entities[3]),
      await this.dbUtils.createTestRelation(entities[3], 'reports_to', entities[0]),
      await this.dbUtils.createTestRelation(entities[0], 'collaborates_with', entities[4])
    ];
  }
}

test.describe('AI Search Functionality', () => {
  let dbUtils: TestDatabaseUtils;
  let testEntities: string[] = [];
  let testRelations: string[] = [];
  let searchHelpers: SearchHelpers;
  let testDataHelpers: TestDataHelpers;

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    // Initialize helpers
    searchHelpers = new SearchHelpers(page);
    testDataHelpers = new TestDataHelpers(dbUtils);
    
    // Clean database and create test data
    await dbUtils.cleanDatabase();
    testEntities = await testDataHelpers.createStandardTestEntities();
    testRelations = await testDataHelpers.createStandardTestRelations(testEntities);
    
    // Navigate and ensure UI is ready
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await searchHelpers.ensureAiSidebarVisible();
  });

  test.afterAll(async () => {
    await dbUtils.close();
  });

  test.describe('Basic Search Operations', () => {
    test('should perform search and display results', async ({ page }) => {
      await searchHelpers.performSearch('entities with facial data');
      await searchHelpers.verifyResultCount(3); // 3 entities have facial data
      
      // Verify result format
      const firstResult = (await searchHelpers.getSearchResults()).first();
      await expect(firstResult).toContainText('Entity');
      await expect(firstResult).toContainText('👤'); // Facial indicator
    });

    test('should search for entities by data type', async ({ page }) => {
      await searchHelpers.performSearch('text documents');
      await searchHelpers.verifyResultCount(3); // 3 entities have text data
      await searchHelpers.verifyAllResultsContain('📝');
    });

    test('should search for relations by predicate', async ({ page }) => {
      await searchHelpers.performSearch('who manages');
      
      const searchResults = await searchHelpers.getSearchResults();
      await expect(searchResults).toBeVisible();
      await expect(searchResults.first()).toContainText('manages');
    });

    test('should handle empty search results', async ({ page }) => {
      await searchHelpers.performSearch('quantum physics research papers');
      
      await expect(page.getByTestId('search-no-results')).toBeVisible();
      await expect(page.getByTestId('search-no-results')).toContainText('No results found');
    });

    test('should clear search results', async ({ page }) => {
      await searchHelpers.performSearch('entities');
      await searchHelpers.verifyResultCount(5);
      
      await searchHelpers.clearSearch();
      
      await expect(page.getByTestId('ai-search-input')).toHaveValue('');
      await searchHelpers.verifyResultCount(0);
    });
  });

  test.describe('Search Result Interactions', () => {
    test('should select entity from search results', async ({ page }) => {
      await searchHelpers.performSearch('facial recognition');
      
      const searchResult = (await searchHelpers.getSearchResults()).first();
      await searchResult.click();
      
      await verifyEntitySelection(page);
    });

    async function verifyEntitySelection(page: Page) {
      const selectedNode = page.locator('.react-flow__node.selected');
      await expect(selectedNode).toBeVisible();
      
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Entity');
    }

    test('should highlight entity in graph when hovering search result', async ({ page }) => {
      await searchHelpers.performSearch('entities');
      
      const searchResult = (await searchHelpers.getSearchResults()).first();
      await searchResult.hover();
      
      const highlightedNode = page.locator('.react-flow__node.highlighted');
      await expect(highlightedNode).toBeVisible();
    });

    test('should navigate to entity when double-clicking search result', async ({ page }) => {
      await searchHelpers.performSearch('all entities');
      
      const searchResult = (await searchHelpers.getSearchResults()).first();
      await searchResult.dblclick();
      
      await expect(page.locator('.react-flow__node.selected')).toBeInViewport();
    });
  });

  test.describe('Advanced Search Features', () => {
    test('should support natural language queries', async ({ page }) => {
      await searchHelpers.performSearch('find all people who work together and have facial data');
      
      const searchResults = await searchHelpers.getSearchResults();
      await expect(searchResults).toBeVisible();
      
      const resultsText = await searchResults.allTextContents();
      expect(resultsText.some(text => text.includes('👤'))).toBeTruthy();
    });

    test('should search across entity relationships', async ({ page }) => {
      await searchHelpers.performSearch('entities connected to managers');
      
      const searchResults = await searchHelpers.getSearchResults();
      await expect(searchResults).toBeVisible();
    });

    test('should provide search suggestions', async ({ page }) => {
      await page.getByTestId('ai-search-tab').click();
      const searchInput = page.getByTestId('ai-search-input');
      await searchInput.fill('ent');
      
      await verifySearchSuggestions(page);
    });

    async function verifySearchSuggestions(page: Page) {
      await expect(page.getByTestId('search-suggestions')).toBeVisible();
      
      const suggestions = page.locator('[data-test="search-suggestion"]');
      await expect(suggestions).toHaveCount(3);
      
      await suggestions.first().click();
      await expect(page.getByTestId('ai-search-input')).toHaveValue('entities');
    }

    test('should save recent searches', async ({ page }) => {
      const searches = ['facial data', 'text documents', 'management relations'];
      
      await performMultipleSearches(page, searches, searchHelpers);
      await verifyRecentSearches(page, searches);
    });

    async function performMultipleSearches(page: Page, searches: string[], helpers: SearchHelpers) {
      for (const query of searches) {
        await helpers.performSearch(query);
        await page.waitForTimeout(500);
      }
    }

    async function verifyRecentSearches(page: Page, searches: string[]) {
      await page.getByTestId('clear-search-button').click();
      await page.getByTestId('ai-search-input').click();
      
      await expect(page.getByTestId('recent-searches')).toBeVisible();
      
      const recentSearches = page.locator('[data-test="recent-search-item"]');
      await expect(recentSearches).toHaveCount(3);
      
      await recentSearches.first().click();
      await expect(page.getByTestId('ai-search-input')).toHaveValue(searches[2]);
    }
  });

  test.describe('Search Performance and Error Handling', () => {
    test('should handle search timeout gracefully', async ({ page }) => {
      await searchHelpers.mockApiResponse({ body: 'Request Timeout' }, 408, 15000);
      
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('test query');
      await page.getByTestId('ai-search-button').click();
      
      await verifyErrorMessage(page, 'timeout');
    });

    async function verifyErrorMessage(page: Page, expectedText: string) {
      await expect(page.getByTestId('search-error')).toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId('search-error')).toContainText(expectedText);
    }

    test('should handle API errors', async ({ page }) => {
      await searchHelpers.mockApiError(500, 'Internal Server Error');
      
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('ai-search-input').fill('test query');
      await page.getByTestId('ai-search-button').click();
      
      await expect(page.getByTestId('search-error')).toBeVisible();
      await expect(page.getByTestId('search-error')).toContainText('error occurred');
      await expect(page.getByTestId('retry-search-button')).toBeVisible();
    });

    test('should debounce search input', async ({ page }) => {
      const callCount = await testSearchDebouncing(page);
      expect(callCount).toBe(1);
    });

    async function testSearchDebouncing(page: Page): Promise<number> {
      let searchCallCount = 0;
      await page.route('**/api/ai/search*', route => {
        searchCallCount++;
        route.fulfill({ status: 200, body: JSON.stringify({ results: [] }) });
      });
      
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('auto-search-toggle').click();
      
      const searchInput = page.getByTestId('ai-search-input');
      await searchInput.type('test query with multiple words', { delay: 50 });
      
      await page.waitForTimeout(1000);
      return searchCallCount;
    }

    test('should cancel previous search when new search starts', async ({ page }) => {
      const apiCalls = await testSearchCancellation(page);
      
      expect(apiCalls).toContain('first query');
      expect(apiCalls).toContain('second query');
      await expect(page.getByTestId('search-query-display')).toContainText('second query');
    });

    async function testSearchCancellation(page: Page): Promise<string[]> {
      const apiCalls: string[] = [];
      await page.route('**/api/ai/search*', async route => {
        const url = new URL(route.request().url());
        const query = url.searchParams.get('q');
        apiCalls.push(query || '');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.fulfill({ status: 200, body: JSON.stringify({ results: [] }) });
      });
      
      await page.getByTestId('ai-search-tab').click();
      
      await page.getByTestId('ai-search-input').fill('first query');
      await page.getByTestId('ai-search-button').click();
      
      await page.waitForTimeout(500);
      
      await page.getByTestId('ai-search-input').fill('second query');
      await page.getByTestId('ai-search-button').click();
      
      await page.waitForTimeout(3000);
      return apiCalls;
    }
  });

  test.describe('Search Filters and Options', () => {
    test('should filter search by entity type', async ({ page }) => {
      await applySearchFilter(page, 'filter-facial-only');
      await searchHelpers.performSearch('all entities');
      
      await searchHelpers.verifyResultCount(3);
      await searchHelpers.verifyAllResultsContain('👤');
    });

    async function applySearchFilter(page: Page, filterId: string) {
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('search-filter-button').click();
      await page.getByTestId(filterId).check();
    }

    test('should search with case sensitivity option', async ({ page }) => {
      await enableCaseSensitiveSearch(page);
      
      const uppercaseCount = await getSearchResultCount(page, 'MANAGES', searchHelpers);
      const lowercaseCount = await getSearchResultCount(page, 'manages', searchHelpers);
      
      expect(uppercaseCount).not.toBe(lowercaseCount);
    });

    async function enableCaseSensitiveSearch(page: Page) {
      await page.getByTestId('ai-search-tab').click();
      await page.getByTestId('search-options-button').click();
      await page.getByTestId('case-sensitive-toggle').click();
    }

    async function getSearchResultCount(page: Page, query: string, helpers: SearchHelpers): Promise<number> {
      await helpers.performSearch(query);
      const results = await helpers.getSearchResults();
      return await results.count();
    }

    test('should export search results', async ({ page }) => {
      await searchHelpers.performSearch('all data');
      await verifySearchExport(page);
    });

    async function verifySearchExport(page: Page) {
      await expect(page.getByTestId('export-search-results')).toBeVisible();
      
      const downloadPromise = page.waitForEvent('download');
      await page.getByTestId('export-search-results').click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('search-results');
      expect(download.suggestedFilename()).toMatch(/\.(json|csv)$/);
    }
  });
});