import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main page successfully', async ({ page }) => {
    // Check main container exists
    await expect(page.locator('[data-test="main-container"]')).toBeVisible();
    
    // Check flow container exists
    await expect(page.locator('[data-test="flow-container"]')).toBeVisible();
    
    // Check AI sidebar is visible by default
    await expect(page.locator('[data-test="ai-sidebar"]')).toBeVisible();
  });

  test('should toggle AI sidebar visibility', async ({ page }) => {
    const toggleButton = page.locator('[data-test="toggle-sidebar"]');
    const sidebar = page.locator('[data-test="ai-sidebar"]');
    
    // Sidebar should be visible initially
    await expect(sidebar).toBeVisible();
    await expect(toggleButton).toContainText('Hide AI Tools');
    
    // Click to hide sidebar
    await toggleButton.click();
    await expect(sidebar).not.toBeVisible();
    await expect(toggleButton).toContainText('Show AI Tools');
    
    // Click to show sidebar again
    await toggleButton.click();
    await expect(sidebar).toBeVisible();
    await expect(toggleButton).toContainText('Hide AI Tools');
  });

  test('should display ReactFlow components', async ({ page }) => {
    // Wait for ReactFlow to initialize
    await page.waitForSelector('[data-test="react-flow"]', { timeout: 10000 });
    
    // Check flow controls are visible
    await expect(page.locator('[data-test="flow-controls"]')).toBeVisible();
    
    // Check minimap is visible
    await expect(page.locator('[data-test="flow-minimap"]')).toBeVisible();
  });

  test('should not show selected item info initially', async ({ page }) => {
    // Selected item info should not be visible when nothing is selected
    await expect(page.locator('[data-test="selected-item-info"]')).not.toBeVisible();
  });
});