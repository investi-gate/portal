# portal, reactflow-app, investigation-frontend, nextjs, tailwind-v4, e2e-testing

## Project Overview
- Investigation portal built with Next.js and ReactFlow
- Interactive flow diagram interface for investigation management
- Using Tailwind CSS v4 with CSS-based configuration

## Technology Stack
- **Framework**: Next.js 15.4.1 with React 19
- **Flow Diagrams**: ReactFlow (@xyflow/react)
- **Styling**: Tailwind CSS v4 (uses @theme directive, no config file needed)
- **TypeScript**: Enabled for type safety
- **E2E Testing**: Playwright for end-to-end testing

## Development Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test:e2e` - Run e2e tests with Playwright
- `npm run test:e2e:ui` - Run e2e tests with Playwright UI mode
- `npm run test:e2e:debug` - Debug e2e tests

## E2E Testing Guidelines
- **Framework**: Playwright for cross-browser testing
- **Test Location**: `/tests/e2e/` directory
- **Configuration**: `playwright.config.ts` in project root
- **Element Selection**: ALWAYS use `data-test=""` attributes for finding elements
- **Test Structure**: Page Object Model pattern recommended
- **Coverage**: Test core user flows including node creation, edge connections, and flow interactions
- **Test Database**: Uses separate `investi_gate_test` database configured in `.env.test`

## E2E Testing Best Practices
- Add `data-test` attributes to all interactive elements
- Use descriptive test names that explain the user flow
- Keep tests independent and isolated
- Test against development server locally
- Mock external dependencies when needed
- Run tests in CI pipeline before deployment
- Use test database utilities in `tests/e2e/helpers/db-utils.ts` for data setup
- Tests automatically set up and tear down test database via global setup/teardown

## Test Database Setup
- **Configuration**: `.env.test` file with `DATABASE_URL` pointing to test database
- **Auto-setup**: Test database is created and migrated automatically before tests
- **Seeding**: Use `TestDatabaseUtils` class for creating test data
- **Cleanup**: Database is dropped after all tests complete
- **Manual setup**: Run `npm run test:e2e:setup` to manually set up test database

## ReactFlow Implementation
- Main flow component in `/src/app/page.tsx`
- Full-screen flow canvas with controls and minimap
- Custom node styling using Tailwind classes
- Interactive node creation and edge connections

## Tailwind v4 Notes
- Configuration via CSS `@theme` directive (no tailwind.config.js)
- Styles defined in `/src/app/globals.css`
- ReactFlow components styled with Tailwind @apply directives
- PostCSS configured with @tailwindcss/postcss plugin

## Project Structure
- `/src/app/page.tsx` - Main ReactFlow application
- `/src/app/globals.css` - Global styles and ReactFlow theming
- `/src/app/layout.tsx` - Root layout component
- `/public/` - Static assets (cleaned of boilerplate)
- `/tests/e2e/` - End-to-end test files
- `/playwright.config.ts` - Playwright configuration