# E2E Tests for InvestiGate Portal

This directory contains end-to-end tests for the InvestiGate portal using Playwright.

## Test Database Setup

Tests use a separate database (`investi_gate_test`) to avoid affecting development data:

- **Automatic**: Database is created/migrated before tests and dropped after
- **Configuration**: `.env.test` file contains test database URL
- **Manual setup**: `npm run test:e2e:setup` (if needed)

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests in UI mode (recommended for development)
npm run test:e2e:ui

# Debug tests
npm run test:e2e:debug

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/homepage.spec.ts

# Run with specific browser
npx playwright test --project=chromium
```

## Test Structure

- `homepage.spec.ts` - Basic homepage functionality tests
- `ai-search.spec.ts` - AI search panel tests
- `homepage-pom.spec.ts` - Example using Page Object Model pattern
- `pages/` - Page Object Model classes
- `helpers/` - Test utilities and mock data

## Writing Tests

### Using data-test Attributes

Always use `data-test` attributes to find elements:

```typescript
const button = page.locator('[data-test="search-button"]');
```

### Page Object Model

For complex tests, use the Page Object Model pattern:

```typescript
import { HomePage } from './pages/homepage.page';

test('example', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.toggleSidebar();
});
```

### Mocking API Responses

```typescript
await page.route('**/api/ai/search', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([/* mock data */])
  });
});
```

## Database Testing

### Using Test Database Utilities

```typescript
import { withTestDatabase, testDataFactories } from './helpers/db-utils';

test('example with database', async ({ page }) => {
  // Set up test data
  await withTestDatabase(async (db) => {
    await db.clearAllData();
    await db.createEntity({ id: 'test-1', type_facial_data_id: 'facial_data' });
    await db.createRelation({
      subject_entity_id: 'test-1',
      predicate: 'knows',
      object_entity_id: 'test-2'
    });
  });
  
  // Test your application
  await page.goto('/');
  // ... assertions
});
```

### Test Data Factories

```typescript
// Create investigation scenario with multiple entities and relations
await withTestDatabase(async (db) => {
  await testDataFactories.investigationScenario(db);
});
```

## Best Practices

1. Always add `data-test` attributes to interactive elements
2. Keep tests independent and isolated
3. Use descriptive test names
4. Mock external dependencies
5. Use Page Object Model for complex pages
6. Run tests locally before committing
7. Clear test data between tests to ensure isolation
8. Use test database utilities instead of direct SQL

## Debugging

- Use `test:e2e:ui` for interactive debugging
- Add `await page.pause()` to pause execution
- Use `--debug` flag for step-by-step debugging
- Check test reports in `playwright-report/` after running tests
- Inspect test database: `psql investi_gate_test`