import { Page, Locator } from '@playwright/test';

export class AISearchPanel {
  readonly page: Page;
  readonly panel: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchResults: Locator;
  readonly resultsCount: Locator;
  readonly resultItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.locator('[data-test="ai-search-panel"]');
    this.searchInput = page.locator('[data-test="search-input"]');
    this.searchButton = page.locator('[data-test="search-button"]');
    this.searchResults = page.locator('[data-test="search-results"]');
    this.resultsCount = page.locator('[data-test="results-count"]');
    this.resultItems = page.locator('[data-test="search-result-item"]');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  async waitForResults() {
    await this.searchResults.waitFor({ state: 'visible' });
  }

  async getResultCount() {
    const text = await this.resultsCount.textContent();
    const match = text?.match(/Found (\d+) results/);
    return match ? parseInt(match[1]) : 0;
  }

  async clickResult(index: number) {
    await this.resultItems.nth(index).click();
  }

  async isLoading() {
    const buttonText = await this.searchButton.textContent();
    return buttonText === 'Searching...';
  }
}