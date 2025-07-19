import { test, expect } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

test.describe('UI Interactions', () => {
  let dbUtils: TestDatabaseUtils;

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    // Clean database and create some test data
    await dbUtils.cleanDatabase();
    
    // Create a few entities and relations for UI testing
    const entity1 = await dbUtils.createTestEntity({ facial: true, text: false });
    const entity2 = await dbUtils.createTestEntity({ facial: false, text: true });
    const entity3 = await dbUtils.createTestEntity({ facial: true, text: true });
    
    await dbUtils.createTestRelation(entity1, 'knows', entity2);
    await dbUtils.createTestRelation(entity2, 'works_with', entity3);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await dbUtils.close();
  });

  test.describe('Sidebar Toggle', () => {
    test('should toggle AI sidebar visibility', async ({ page }) => {
      // Verify sidebar is initially visible
      const sidebar = page.getByTestId('ai-sidebar');
      await expect(sidebar).toBeVisible();
      
      // Toggle sidebar closed
      await page.getByTestId('toggle-ai-sidebar').click();
      await expect(sidebar).toBeHidden();
      
      // Verify main content expands
      const mainContent = page.getByTestId('main-content');
      await expect(mainContent).toHaveClass(/expanded/);
      
      // Toggle sidebar open
      await page.getByTestId('toggle-ai-sidebar').click();
      await expect(sidebar).toBeVisible();
      await expect(mainContent).not.toHaveClass(/expanded/);
    });

    test('should persist sidebar state on page reload', async ({ page }) => {
      // Close sidebar
      await page.getByTestId('toggle-ai-sidebar').click();
      await expect(page.getByTestId('ai-sidebar')).toBeHidden();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify sidebar remains closed
      await expect(page.getByTestId('ai-sidebar')).toBeHidden();
    });

    test('should show tooltip on toggle button hover', async ({ page }) => {
      // Hover over toggle button
      await page.getByTestId('toggle-ai-sidebar').hover();
      
      // Verify tooltip appears
      const tooltip = page.getByTestId('sidebar-toggle-tooltip');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('AI Tools');
    });
  });

  test.describe('Tab Navigation', () => {
    test('should navigate between AI analysis tabs', async ({ page }) => {
      // Ensure sidebar is visible
      const sidebar = page.getByTestId('ai-sidebar');
      if (!(await sidebar.isVisible())) {
        await page.getByTestId('toggle-ai-sidebar').click();
      }
      
      // Click through all tabs
      const tabs = ['ai-search-tab', 'ai-importance-tab', 'ai-patterns-tab', 'ai-clusters-tab', 'ai-suggestions-tab'];
      
      for (const tabId of tabs) {
        await page.getByTestId(tabId).click();
        
        // Verify tab is active
        await expect(page.getByTestId(tabId)).toHaveClass(/active/);
        
        // Verify corresponding panel is visible
        const panelId = tabId.replace('-tab', '-panel');
        await expect(page.getByTestId(panelId)).toBeVisible();
      }
    });

    test('should navigate tabs with keyboard', async ({ page }) => {
      // Focus on first tab
      await page.getByTestId('ai-search-tab').focus();
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('ai-importance-tab')).toHaveClass(/active/);
      
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('ai-patterns-tab')).toHaveClass(/active/);
      
      // Navigate backwards
      await page.keyboard.press('ArrowLeft');
      await expect(page.getByTestId('ai-importance-tab')).toHaveClass(/active/);
    });

    test('should remember last active tab on reload', async ({ page }) => {
      // Navigate to patterns tab
      await page.getByTestId('ai-patterns-tab').click();
      await expect(page.getByTestId('ai-patterns-tab')).toHaveClass(/active/);
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify patterns tab is still active
      await expect(page.getByTestId('ai-patterns-tab')).toHaveClass(/active/);
      await expect(page.getByTestId('ai-patterns-panel')).toBeVisible();
    });
  });

  test.describe('Data Management Panel', () => {
    test('should switch between entities and relations view', async ({ page }) => {
      // Click on entities tab
      await page.getByTestId('entities-tab').click();
      await expect(page.getByTestId('entities-panel')).toBeVisible();
      await expect(page.getByTestId('relations-panel')).toBeHidden();
      
      // Click on relations tab
      await page.getByTestId('relations-tab').click();
      await expect(page.getByTestId('relations-panel')).toBeVisible();
      await expect(page.getByTestId('entities-panel')).toBeHidden();
    });

    test('should show entity/relation counts', async ({ page }) => {
      // Verify entity count
      await expect(page.getByTestId('entity-count')).toContainText('3');
      
      // Verify relation count
      await expect(page.getByTestId('relation-count')).toContainText('2');
    });

    test('should collapse/expand data sections', async ({ page }) => {
      // Click to collapse entities section
      await page.getByTestId('collapse-entities').click();
      await expect(page.getByTestId('entities-list')).toBeHidden();
      
      // Click to expand
      await page.getByTestId('collapse-entities').click();
      await expect(page.getByTestId('entities-list')).toBeVisible();
    });
  });

  test.describe('Forms and Modals', () => {
    test('should open and close entity creation modal', async ({ page }) => {
      // Open modal
      await page.getByTestId('add-entity-button').click();
      const modal = page.getByTestId('entity-modal');
      await expect(modal).toBeVisible();
      
      // Close with X button
      await modal.getByTestId('close-modal').click();
      await expect(modal).toBeHidden();
      
      // Open again
      await page.getByTestId('add-entity-button').click();
      await expect(modal).toBeVisible();
      
      // Close with Cancel button
      await modal.getByTestId('cancel-button').click();
      await expect(modal).toBeHidden();
      
      // Open again
      await page.getByTestId('add-entity-button').click();
      await expect(modal).toBeVisible();
      
      // Close with Escape key
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    });

    test('should validate form fields', async ({ page }) => {
      // Open entity creation modal
      await page.getByTestId('add-entity-button').click();
      
      // Try to submit without selecting any type
      await page.getByTestId('create-entity-button').click();
      
      // Verify validation error
      await expect(page.getByTestId('entity-type-error')).toBeVisible();
      await expect(page.getByTestId('entity-type-error')).toContainText('Select at least one data type');
      
      // Select a type
      await page.getByTestId('entity-type-facial').check();
      
      // Verify error disappears
      await expect(page.getByTestId('entity-type-error')).toBeHidden();
    });

    test('should show form field focus states', async ({ page }) => {
      // Open relation creation form
      await page.getByTestId('add-relation-button').click();
      
      // Focus on predicate input
      const predicateInput = page.getByTestId('relation-predicate-input');
      await predicateInput.focus();
      
      // Verify focus styling
      await expect(predicateInput).toHaveClass(/focused/);
      
      // Blur and verify style changes
      await predicateInput.blur();
      await expect(predicateInput).not.toHaveClass(/focused/);
    });
  });

  test.describe('Loading States', () => {
    test('should show loading spinner during data fetch', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/entities', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });
      
      // Reload page
      await page.reload();
      
      // Verify loading state
      await expect(page.getByTestId('entities-loading')).toBeVisible();
      await expect(page.getByTestId('entities-loading')).toContainText('Loading');
      
      // Wait for loading to complete
      await expect(page.getByTestId('entities-loading')).toBeHidden({ timeout: 5000 });
    });

    test('should show skeleton loaders', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/ai/analyze', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });
      
      // Trigger analysis
      await page.getByTestId('ai-importance-tab').click();
      await page.getByTestId('run-importance-analysis').click();
      
      // Verify skeleton loaders
      await expect(page.getByTestId('skeleton-loader')).toBeVisible();
      await expect(page.locator('[data-test="skeleton-loader"]')).toHaveCount(3);
    });
  });

  test.describe('Error States', () => {
    test('should show error message on API failure', async ({ page }) => {
      // Mock API error
      await page.route('**/api/entities', route => 
        route.fulfill({ status: 500, body: 'Server error' })
      );
      
      // Reload page
      await page.reload();
      
      // Verify error state
      await expect(page.getByTestId('entities-error')).toBeVisible();
      await expect(page.getByTestId('entities-error')).toContainText('Failed to load entities');
      
      // Verify retry button
      await expect(page.getByTestId('retry-load-entities')).toBeVisible();
    });

    test('should retry failed requests', async ({ page }) => {
      let requestCount = 0;
      
      // Mock API to fail first time, succeed second time
      await page.route('**/api/entities', route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({ status: 500, body: 'Server error' });
        } else {
          route.continue();
        }
      });
      
      // Reload page
      await page.reload();
      
      // Wait for error
      await expect(page.getByTestId('entities-error')).toBeVisible();
      
      // Click retry
      await page.getByTestId('retry-load-entities').click();
      
      // Verify success
      await expect(page.getByTestId('entities-error')).toBeHidden();
      await expect(page.locator('[data-test="entity-item"]')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout for mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify sidebar is hidden by default on mobile
      await expect(page.getByTestId('ai-sidebar')).toBeHidden();
      
      // Verify hamburger menu is visible
      await expect(page.getByTestId('mobile-menu-button')).toBeVisible();
      
      // Open mobile menu
      await page.getByTestId('mobile-menu-button').click();
      await expect(page.getByTestId('mobile-menu')).toBeVisible();
    });

    test('should show mobile-optimized modals', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Open entity creation modal
      await page.getByTestId('add-entity-button').click();
      
      // Verify modal takes full screen on mobile
      const modal = page.getByTestId('entity-modal');
      await expect(modal).toHaveClass(/mobile-fullscreen/);
    });

    test('should handle touch gestures on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Simulate swipe to open sidebar
      await page.locator('body').evaluate(el => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 0, clientY: 100 }] as any
        });
        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 200, clientY: 100 }] as any
        });
        el.dispatchEvent(touchStart);
        el.dispatchEvent(touchEnd);
      });
      
      // Verify sidebar opens
      await expect(page.getByTestId('ai-sidebar')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('toggle-ai-sidebar')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('add-entity-button')).toBeFocused();
      
      // Activate button with Enter
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('entity-modal')).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Verify ARIA labels
      await expect(page.getByTestId('toggle-ai-sidebar')).toHaveAttribute('aria-label', 'Toggle AI sidebar');
      await expect(page.getByTestId('ai-sidebar')).toHaveAttribute('aria-label', 'AI analysis tools');
      await expect(page.getByTestId('main-content')).toHaveAttribute('aria-label', 'Main graph view');
    });

    test('should announce dynamic content changes', async ({ page }) => {
      // Create entity and verify announcement
      await page.getByTestId('add-entity-button').click();
      await page.getByTestId('entity-type-facial').check();
      await page.getByTestId('create-entity-button').click();
      
      // Verify live region announcement
      const liveRegion = page.getByTestId('live-region');
      await expect(liveRegion).toContainText('Entity created successfully');
    });

    test('should support screen reader navigation', async ({ page }) => {
      // Verify heading hierarchy
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');
      
      await expect(h1).toHaveCount(1);
      expect(await h2.count()).toBeGreaterThan(0);
      
      // Verify landmark regions
      await expect(page.locator('nav')).toHaveAttribute('aria-label');
      await expect(page.locator('main')).toHaveAttribute('aria-label');
    });
  });

  test.describe('Theme and Appearance', () => {
    test('should toggle dark mode', async ({ page }) => {
      // Open settings
      await page.getByTestId('settings-button').click();
      
      // Toggle dark mode
      await page.getByTestId('dark-mode-toggle').click();
      
      // Verify dark mode class
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      // Verify persists on reload
      await page.reload();
      await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should adjust graph contrast', async ({ page }) => {
      // Open settings
      await page.getByTestId('settings-button').click();
      
      // Adjust contrast slider
      const contrastSlider = page.getByTestId('contrast-slider');
      await contrastSlider.fill('150');
      
      // Verify contrast is applied
      const graphContainer = page.locator('.react-flow');
      const filter = await graphContainer.evaluate(el => 
        window.getComputedStyle(el).filter
      );
      expect(filter).toContain('contrast');
    });
  });

  test.describe('Tooltips and Help', () => {
    test('should show tooltips on hover', async ({ page }) => {
      // Hover over help icon
      await page.getByTestId('help-icon').hover();
      
      // Verify tooltip
      const tooltip = page.getByTestId('help-tooltip');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('Click for help');
      
      // Move away and verify tooltip hides
      await page.mouse.move(0, 0);
      await expect(tooltip).toBeHidden();
    });

    test('should show contextual help', async ({ page }) => {
      // Click help icon
      await page.getByTestId('help-icon').click();
      
      // Verify help modal
      const helpModal = page.getByTestId('help-modal');
      await expect(helpModal).toBeVisible();
      await expect(helpModal).toContainText('Getting Started');
      await expect(helpModal).toContainText('Keyboard Shortcuts');
    });

    test('should show inline help text', async ({ page }) => {
      // Open entity creation modal
      await page.getByTestId('add-entity-button').click();
      
      // Verify inline help
      const helpText = page.getByTestId('entity-type-help');
      await expect(helpText).toBeVisible();
      await expect(helpText).toContainText('Select the data types');
    });
  });

  test.describe('Notifications', () => {
    test('should show success notifications', async ({ page }) => {
      // Create entity
      await page.getByTestId('add-entity-button').click();
      await page.getByTestId('entity-type-facial').check();
      await page.getByTestId('create-entity-button').click();
      
      // Verify notification
      const notification = page.getByTestId('notification');
      await expect(notification).toBeVisible();
      await expect(notification).toHaveClass(/success/);
      await expect(notification).toContainText('Entity created');
      
      // Verify auto-dismiss
      await expect(notification).toBeHidden({ timeout: 5000 });
    });

    test('should stack multiple notifications', async ({ page }) => {
      // Create multiple entities quickly
      for (let i = 0; i < 3; i++) {
        await page.getByTestId('add-entity-button').click();
        await page.getByTestId('entity-type-facial').check();
        await page.getByTestId('create-entity-button').click();
        await page.waitForTimeout(100);
      }
      
      // Verify multiple notifications
      const notifications = page.locator('[data-test="notification"]');
      expect(await notifications.count()).toBeGreaterThan(1);
    });

    test('should allow dismissing notifications', async ({ page }) => {
      // Create entity
      await page.getByTestId('add-entity-button').click();
      await page.getByTestId('entity-type-facial').check();
      await page.getByTestId('create-entity-button').click();
      
      // Dismiss notification
      const notification = page.getByTestId('notification');
      await notification.getByTestId('dismiss-notification').click();
      
      // Verify dismissed immediately
      await expect(notification).toBeHidden();
    });
  });
});