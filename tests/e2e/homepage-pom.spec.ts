import { test, expect } from '@playwright/test';
import { HomePage } from './pages/homepage.page';
import { AISearchPanel } from './pages/ai-search.page';

test.describe('Homepage with Page Object Model', () => {
  let homePage: HomePage;
  let aiSearchPanel: AISearchPanel;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    aiSearchPanel = new AISearchPanel(page);
    await homePage.goto();
  });

  test('should navigate through homepage features', async () => {
    // Check main elements are visible
    await expect(homePage.mainContainer).toBeVisible();
    await expect(homePage.flowContainer).toBeVisible();
    
    // Test sidebar toggle
    expect(await homePage.isSidebarVisible()).toBe(true);
    await homePage.toggleSidebar();
    expect(await homePage.isSidebarVisible()).toBe(false);
    await homePage.toggleSidebar();
    expect(await homePage.isSidebarVisible()).toBe(true);
    
    // Wait for flow to load
    await homePage.waitForFlowToLoad();
    await expect(homePage.flowControls).toBeVisible();
  });

  test('should perform AI search using Page Object Model', async ({ page }) => {
    // Mock the search API
    await page.route('**/api/ai/search', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-entity-1',
            type_facial_data_id: 'face-1',
            type_text_data_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      });
    });

    // Perform search
    await aiSearchPanel.search('test query');
    
    // Wait for results
    await aiSearchPanel.waitForResults();
    
    // Verify result count
    const count = await aiSearchPanel.getResultCount();
    expect(count).toBe(1);
    
    // Click on first result
    await aiSearchPanel.clickResult(0);
    
    // Verify entity is selected
    await expect(homePage.selectedItemInfo).toBeVisible();
  });
});