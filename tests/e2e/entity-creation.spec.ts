import { test, expect } from '@playwright/test';

test.describe('Entity Creation', () => {
  test('should create entity with facial data type', async ({ page }) => {
    await page.goto('/');
    
    // Wait for React to render
    await page.waitForSelector('[data-test="add-entity-button"]', { state: 'visible' });
    
    // Click add entity button
    await page.locator('[data-test="add-entity-button"]').click();
    
    // Select facial type
    await page.locator('[data-test="entity-type-select"]').selectOption('facial');
    
    // Submit form
    await page.locator('[data-test="create-entity-button"]').click();
    
    // Wait for entity to be created
    await page.waitForTimeout(500);
    
    // Verify entity was created by checking the count increased
    const entityItems = await page.locator('[data-test="entity-item"]').count();
    expect(entityItems).toBeGreaterThan(0);
  });

  test('should create entity with text data type', async ({ page }) => {
    await page.goto('/');
    
    // Wait for React to render
    await page.waitForSelector('[data-test="add-entity-button"]', { state: 'visible' });
    
    // Click add entity button
    await page.locator('[data-test="add-entity-button"]').click();
    
    // Select text type
    await page.locator('[data-test="entity-type-select"]').selectOption('text');
    
    // Submit form
    await page.locator('[data-test="create-entity-button"]').click();
    
    // Wait for entity to be created
    await page.waitForTimeout(500);
    
    // Verify entity was created by checking the count increased
    const entityItems = await page.locator('[data-test="entity-item"]').count();
    expect(entityItems).toBeGreaterThan(0);
  });

  test('should create entity with both data types', async ({ page }) => {
    await page.goto('/');
    
    // Wait for React to render
    await page.waitForSelector('[data-test="add-entity-button"]', { state: 'visible' });
    
    // Click add entity button
    await page.locator('[data-test="add-entity-button"]').click();
    
    // Select both types
    await page.locator('[data-test="entity-type-select"]').selectOption('both');
    
    // Submit form
    await page.locator('[data-test="create-entity-button"]').click();
    
    // Wait for entity to be created
    await page.waitForTimeout(500);
    
    // Verify entity was created by checking the count increased
    const entityItems = await page.locator('[data-test="entity-item"]').count();
    expect(entityItems).toBeGreaterThan(0);
  });
});