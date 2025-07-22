import { test, expect, Page } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

// Helper class for common UI interactions
class UITestHelpers {
  constructor(private page: Page) {}

  async toggleSidebar() {
    await this.page.getByTestId('toggle-ai-sidebar').click();
  }

  async verifySidebarVisibility(shouldBeVisible: boolean) {
    const sidebar = this.page.getByTestId('ai-sidebar');
    if (shouldBeVisible) {
      await expect(sidebar).toBeVisible();
    } else {
      await expect(sidebar).toBeHidden();
    }
  }

  async openModal(buttonTestId: string, modalTestId: string) {
    await this.page.getByTestId(buttonTestId).click();
    await expect(this.page.getByTestId(modalTestId)).toBeVisible();
  }

  async closeModal(modalTestId: string, method: 'x' | 'cancel' | 'escape' = 'x') {
    const modal = this.page.getByTestId(modalTestId);
    
    switch (method) {
      case 'x':
        await modal.getByTestId('close-modal').click();
        break;
      case 'cancel':
        await modal.getByTestId('cancel-button').click();
        break;
      case 'escape':
        await this.page.keyboard.press('Escape');
        break;
    }
    
    await expect(modal).toBeHidden();
  }

  async navigateToTab(tabTestId: string) {
    await this.page.getByTestId(tabTestId).click();
    await expect(this.page.getByTestId(tabTestId)).toHaveClass(/active/);
    
    const panelId = tabTestId.replace('-tab', '-panel');
    await expect(this.page.getByTestId(panelId)).toBeVisible();
  }

  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  async mockAPIResponse(url: string, response: any) {
    await this.page.route(url, route => route.fulfill(response));
  }

  async mockSlowAPIResponse(url: string, delay: number) {
    await this.page.route(url, async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      route.continue();
    });
  }

  async verifyNotification(type: 'success' | 'error', text: string) {
    const notification = this.page.getByTestId('notification');
    await expect(notification).toBeVisible();
    await expect(notification).toHaveClass(new RegExp(type));
    await expect(notification).toContainText(text);
  }

  async dismissNotification() {
    const notification = this.page.getByTestId('notification');
    await notification.getByTestId('dismiss-notification').click();
    await expect(notification).toBeHidden();
  }

  async verifyElementVisibility(testId: string, shouldBeVisible: boolean) {
    const element = this.page.getByTestId(testId);
    if (shouldBeVisible) {
      await expect(element).toBeVisible();
    } else {
      await expect(element).toBeHidden();
    }
  }

  async createTestEntity(type: 'facial' | 'text' | 'both' = 'facial') {
    await this.openModal('add-entity-button', 'entity-modal');
    
    if (type === 'facial' || type === 'both') {
      await this.page.getByTestId('entity-type-facial').check();
    }
    if (type === 'text' || type === 'both') {
      await this.page.getByTestId('entity-type-text').check();
    }
    
    await this.page.getByTestId('create-entity-button').click();
  }

  async verifyAriaLabel(testId: string, label: string) {
    await expect(this.page.getByTestId(testId)).toHaveAttribute('aria-label', label);
  }

  async reloadAndWait() {
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }
}

// Test setup helper
async function setupTestData(dbUtils: TestDatabaseUtils) {
  await dbUtils.cleanDatabase();
  
  const entity1 = await dbUtils.createTestEntity({ facial: true, text: false });
  const entity2 = await dbUtils.createTestEntity({ facial: false, text: true });
  const entity3 = await dbUtils.createTestEntity({ facial: true, text: true });
  
  await dbUtils.createTestRelation(entity1, 'knows', entity2);
  await dbUtils.createTestRelation(entity2, 'works_with', entity3);
  
  return { entity1, entity2, entity3 };
}

test.describe('UI Interactions', () => {
  let dbUtils: TestDatabaseUtils;
  let ui: UITestHelpers;

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    ui = new UITestHelpers(page);
    await setupTestData(dbUtils);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await dbUtils.close();
  });

  test.describe('Sidebar Toggle', () => {
    test('should toggle AI sidebar visibility', async ({ page }) => {
      await ui.verifySidebarVisibility(true);
      await ui.toggleSidebar();
      await ui.verifySidebarVisibility(false);
      
      const mainContent = page.getByTestId('main-content');
      await expect(mainContent).toHaveClass(/expanded/);
      
      await ui.toggleSidebar();
      await ui.verifySidebarVisibility(true);
      await expect(mainContent).not.toHaveClass(/expanded/);
    });

    test('should persist sidebar state on page reload', async ({ page }) => {
      await ui.toggleSidebar();
      await ui.verifySidebarVisibility(false);
      
      await ui.reloadAndWait();
      await ui.verifySidebarVisibility(false);
    });

    test('should show tooltip on toggle button hover', async ({ page }) => {
      await page.getByTestId('toggle-ai-sidebar').hover();
      
      const tooltip = page.getByTestId('sidebar-toggle-tooltip');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('AI Tools');
    });
  });

  test.describe('Tab Navigation', () => {
    const AI_TABS = [
      'ai-search-tab',
      'ai-importance-tab', 
      'ai-patterns-tab',
      'ai-clusters-tab',
      'ai-suggestions-tab'
    ];

    test('should navigate between AI analysis tabs', async ({ page }) => {
      const sidebar = page.getByTestId('ai-sidebar');
      if (!(await sidebar.isVisible())) {
        await ui.toggleSidebar();
      }
      
      for (const tabId of AI_TABS) {
        await ui.navigateToTab(tabId);
      }
    });

    test('should navigate tabs with keyboard', async ({ page }) => {
      await page.getByTestId('ai-search-tab').focus();
      
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('ai-importance-tab')).toHaveClass(/active/);
      
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('ai-patterns-tab')).toHaveClass(/active/);
      
      await page.keyboard.press('ArrowLeft');
      await expect(page.getByTestId('ai-importance-tab')).toHaveClass(/active/);
    });

    test('should remember last active tab on reload', async ({ page }) => {
      await ui.navigateToTab('ai-patterns-tab');
      await ui.reloadAndWait();
      
      await expect(page.getByTestId('ai-patterns-tab')).toHaveClass(/active/);
      await ui.verifyElementVisibility('ai-patterns-panel', true);
    });
  });

  test.describe('Data Management Panel', () => {
    test('should switch between entities and relations view', async ({ page }) => {
      await ui.navigateToTab('entities-tab');
      await ui.verifyElementVisibility('relations-panel', false);
      
      await ui.navigateToTab('relations-tab');
      await ui.verifyElementVisibility('entities-panel', false);
    });

    test('should show entity/relation counts', async ({ page }) => {
      await expect(page.getByTestId('entity-count')).toContainText('3');
      await expect(page.getByTestId('relation-count')).toContainText('2');
    });

    test('should collapse/expand data sections', async ({ page }) => {
      const collapseButton = page.getByTestId('collapse-entities');
      
      await collapseButton.click();
      await ui.verifyElementVisibility('entities-list', false);
      
      await collapseButton.click();
      await ui.verifyElementVisibility('entities-list', true);
    });
  });

  test.describe('Forms and Modals', () => {
    test('should open and close entity creation modal', async ({ page }) => {
      const modalTestId = 'entity-modal';
      
      // Test all close methods
      await ui.openModal('add-entity-button', modalTestId);
      await ui.closeModal(modalTestId, 'x');
      
      await ui.openModal('add-entity-button', modalTestId);
      await ui.closeModal(modalTestId, 'cancel');
      
      await ui.openModal('add-entity-button', modalTestId);
      await ui.closeModal(modalTestId, 'escape');
    });

    test('should validate form fields', async ({ page }) => {
      await ui.openModal('add-entity-button', 'entity-modal');
      await page.getByTestId('create-entity-button').click();
      
      const errorElement = page.getByTestId('entity-type-error');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText('Select at least one data type');
      
      await page.getByTestId('entity-type-facial').check();
      await expect(errorElement).toBeHidden();
    });

    test('should show form field focus states', async ({ page }) => {
      await ui.openModal('add-relation-button', 'relation-modal');
      
      const predicateInput = page.getByTestId('relation-predicate-input');
      await predicateInput.focus();
      await expect(predicateInput).toHaveClass(/focused/);
      
      await predicateInput.blur();
      await expect(predicateInput).not.toHaveClass(/focused/);
    });
  });

  test.describe('Loading States', () => {
    test('should show loading spinner during data fetch', async ({ page }) => {
      await ui.mockSlowAPIResponse('**/api/entities', 2000);
      await ui.reloadAndWait();
      
      const loadingElement = page.getByTestId('entities-loading');
      await expect(loadingElement).toBeVisible();
      await expect(loadingElement).toContainText('Loading');
      await expect(loadingElement).toBeHidden({ timeout: 5000 });
    });

    test('should show skeleton loaders', async ({ page }) => {
      await ui.mockSlowAPIResponse('**/api/ai/analyze', 2000);
      
      await ui.navigateToTab('ai-importance-tab');
      await page.getByTestId('run-importance-analysis').click();
      
      await ui.verifyElementVisibility('skeleton-loader', true);
      await expect(page.locator('[data-test="skeleton-loader"]')).toHaveCount(3);
    });
  });

  test.describe('Error States', () => {
    test('should show error message on API failure', async ({ page }) => {
      await ui.mockAPIResponse('**/api/entities', { 
        status: 500, 
        body: 'Server error' 
      });
      
      await ui.reloadAndWait();
      
      const errorElement = page.getByTestId('entities-error');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText('Failed to load entities');
      await ui.verifyElementVisibility('retry-load-entities', true);
    });

    test('should retry failed requests', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/entities', route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({ status: 500, body: 'Server error' });
        } else {
          route.continue();
        }
      });
      
      await ui.reloadAndWait();
      await ui.verifyElementVisibility('entities-error', true);
      
      await page.getByTestId('retry-load-entities').click();
      
      await ui.verifyElementVisibility('entities-error', false);
      await expect(page.locator('[data-test="entity-item"]')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout for mobile viewport', async ({ page }) => {
      await ui.setMobileViewport();
      
      await ui.verifySidebarVisibility(false);
      await ui.verifyElementVisibility('mobile-menu-button', true);
      
      await page.getByTestId('mobile-menu-button').click();
      await ui.verifyElementVisibility('mobile-menu', true);
    });

    test('should show mobile-optimized modals', async ({ page }) => {
      await ui.setMobileViewport();
      await ui.openModal('add-entity-button', 'entity-modal');
      
      const modal = page.getByTestId('entity-modal');
      await expect(modal).toHaveClass(/mobile-fullscreen/);
    });

    test('should handle touch gestures on mobile', async ({ page }) => {
      await ui.setMobileViewport();
      
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
      
      await ui.verifySidebarVisibility(true);
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('toggle-ai-sidebar')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('add-entity-button')).toBeFocused();
      
      await page.keyboard.press('Enter');
      await ui.verifyElementVisibility('entity-modal', true);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await ui.verifyAriaLabel('toggle-ai-sidebar', 'Toggle AI sidebar');
      await ui.verifyAriaLabel('ai-sidebar', 'AI analysis tools');
      await ui.verifyAriaLabel('main-content', 'Main graph view');
    });

    test('should announce dynamic content changes', async ({ page }) => {
      await ui.createTestEntity('facial');
      
      const liveRegion = page.getByTestId('live-region');
      await expect(liveRegion).toContainText('Entity created successfully');
    });

    test('should support screen reader navigation', async ({ page }) => {
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');
      
      await expect(h1).toHaveCount(1);
      expect(await h2.count()).toBeGreaterThan(0);
      
      await expect(page.locator('nav')).toHaveAttribute('aria-label');
      await expect(page.locator('main')).toHaveAttribute('aria-label');
    });
  });

  test.describe('Theme and Appearance', () => {
    async function openSettings(page: Page) {
      await page.getByTestId('settings-button').click();
    }

    test('should toggle dark mode', async ({ page }) => {
      await openSettings(page);
      await page.getByTestId('dark-mode-toggle').click();
      
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      await ui.reloadAndWait();
      await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should adjust graph contrast', async ({ page }) => {
      await openSettings(page);
      
      const contrastSlider = page.getByTestId('contrast-slider');
      await contrastSlider.fill('150');
      
      const graphContainer = page.locator('.react-flow');
      const filter = await graphContainer.evaluate(el => 
        window.getComputedStyle(el).filter
      );
      expect(filter).toContain('contrast');
    });
  });

  test.describe('Tooltips and Help', () => {
    async function verifyTooltip(page: Page, elementId: string, tooltipId: string, text: string) {
      await page.getByTestId(elementId).hover();
      
      const tooltip = page.getByTestId(tooltipId);
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(text);
      
      await page.mouse.move(0, 0);
      await expect(tooltip).toBeHidden();
    }

    test('should show tooltips on hover', async ({ page }) => {
      await verifyTooltip(page, 'help-icon', 'help-tooltip', 'Click for help');
    });

    test('should show contextual help', async ({ page }) => {
      await page.getByTestId('help-icon').click();
      
      const helpModal = page.getByTestId('help-modal');
      await expect(helpModal).toBeVisible();
      await expect(helpModal).toContainText('Getting Started');
      await expect(helpModal).toContainText('Keyboard Shortcuts');
    });

    test('should show inline help text', async ({ page }) => {
      await ui.openModal('add-entity-button', 'entity-modal');
      
      const helpText = page.getByTestId('entity-type-help');
      await expect(helpText).toBeVisible();
      await expect(helpText).toContainText('Select the data types');
    });
  });

  test.describe('Notifications', () => {
    test('should show success notifications', async ({ page }) => {
      await ui.createTestEntity('facial');
      await ui.verifyNotification('success', 'Entity created');
      
      const notification = page.getByTestId('notification');
      await expect(notification).toBeHidden({ timeout: 5000 });
    });

    test('should stack multiple notifications', async ({ page }) => {
      for (let i = 0; i < 3; i++) {
        await ui.createTestEntity('facial');
        await page.waitForTimeout(100);
      }
      
      const notifications = page.locator('[data-test="notification"]');
      expect(await notifications.count()).toBeGreaterThan(1);
    });

    test('should allow dismissing notifications', async ({ page }) => {
      await ui.createTestEntity('facial');
      await ui.dismissNotification();
    });
  });
});