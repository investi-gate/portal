import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly mainContainer: Locator;
  readonly flowContainer: Locator;
  readonly aiSidebar: Locator;
  readonly toggleSidebarButton: Locator;
  readonly selectedItemInfo: Locator;
  readonly reactFlow: Locator;
  readonly flowControls: Locator;
  readonly flowMinimap: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainContainer = page.locator('[data-test="main-container"]');
    this.flowContainer = page.locator('[data-test="flow-container"]');
    this.aiSidebar = page.locator('[data-test="ai-sidebar"]');
    this.toggleSidebarButton = page.locator('[data-test="toggle-sidebar"]');
    this.selectedItemInfo = page.locator('[data-test="selected-item-info"]');
    this.reactFlow = page.locator('[data-test="react-flow"]');
    this.flowControls = page.locator('[data-test="flow-controls"]');
    this.flowMinimap = page.locator('[data-test="flow-minimap"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async toggleSidebar() {
    await this.toggleSidebarButton.click();
  }

  async isSidebarVisible() {
    return await this.aiSidebar.isVisible();
  }

  async waitForFlowToLoad() {
    await this.reactFlow.waitFor({ state: 'visible', timeout: 10000 });
  }
}