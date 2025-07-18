import { test, expect } from '@playwright/test';

test.describe('AI Search Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Ensure AI sidebar is visible
    const sidebar = page.locator('[data-test="ai-sidebar"]');
    if (!(await sidebar.isVisible())) {
      await page.locator('[data-test="toggle-sidebar"]').click();
    }
  });

  test('should display AI search panel', async ({ page }) => {
    const searchPanel = page.locator('[data-test="ai-search-panel"]');
    await expect(searchPanel).toBeVisible();
    
    // Check search input exists
    await expect(page.locator('[data-test="search-input"]')).toBeVisible();
    
    // Check search button exists
    await expect(page.locator('[data-test="search-button"]')).toBeVisible();
    await expect(page.locator('[data-test="search-button"]')).toContainText('Search');
  });

  test('should not allow empty search', async ({ page }) => {
    const searchButton = page.locator('[data-test="search-button"]');
    const searchInput = page.locator('[data-test="search-input"]');
    
    // Clear input to ensure it's empty
    await searchInput.clear();
    
    // Click search without entering anything
    await searchButton.click();
    
    // Results should not appear
    await expect(page.locator('[data-test="search-results"]')).not.toBeVisible();
  });

  test('should show loading state during search', async ({ page }) => {
    const searchInput = page.locator('[data-test="search-input"]');
    const searchButton = page.locator('[data-test="search-button"]');
    
    // Enter search query
    await searchInput.fill('test entity');
    
    // Start intercepting the API call to delay response
    await page.route('**/api/ai/search', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    // Click search
    await searchButton.click();
    
    // Button should show loading state
    await expect(searchButton).toContainText('Searching...');
    await expect(searchButton).toBeDisabled();
    
    // Wait for search to complete
    await expect(searchButton).toContainText('Search');
    await expect(searchButton).toBeEnabled();
  });

  test('should display search results', async ({ page }) => {
    const searchInput = page.locator('[data-test="search-input"]');
    const searchButton = page.locator('[data-test="search-button"]');
    
    // Mock search API response
    await page.route('**/api/ai/search', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'entity-123',
            type_facial_data_id: 'face-123',
            type_text_data_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'entity-456',
            type_facial_data_id: null,
            type_text_data_id: 'text-456',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      });
    });
    
    // Enter search query
    await searchInput.fill('test search');
    
    // Click search
    await searchButton.click();
    
    // Wait for results
    await expect(page.locator('[data-test="search-results"]')).toBeVisible();
    
    // Check results count
    await expect(page.locator('[data-test="results-count"]')).toContainText('Found 2 results');
    
    // Check result items
    const resultItems = page.locator('[data-test="search-result-item"]');
    await expect(resultItems).toHaveCount(2);
    
    // Check first result
    await expect(resultItems.nth(0)).toContainText('Entity entity-1');
    await expect(resultItems.nth(0)).toContainText('👤 Facial Data');
    
    // Check second result
    await expect(resultItems.nth(1)).toContainText('Entity entity-4');
    await expect(resultItems.nth(1)).toContainText('📝 Text Data');
  });

  test('should select entity on result click', async ({ page }) => {
    // Mock search API response
    await page.route('**/api/ai/search', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'entity-789',
            type_facial_data_id: 'face-789',
            type_text_data_id: 'text-789',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      });
    });
    
    // Perform search
    await page.locator('[data-test="search-input"]').fill('find entity');
    await page.locator('[data-test="search-button"]').click();
    
    // Wait for results
    await expect(page.locator('[data-test="search-results"]')).toBeVisible();
    
    // Click on result
    await page.locator('[data-test="search-result-item"]').first().click();
    
    // Check if selected entity info appears
    await expect(page.locator('[data-test="selected-item-info"]')).toBeVisible();
    await expect(page.locator('[data-test="selected-entity"]')).toBeVisible();
    await expect(page.locator('[data-test="selected-entity"]')).toContainText('entity-789');
  });
});