# portal, reactflow-app, investigation-frontend, nextjs, tailwind-v4

## Project Overview
- Investigation portal built with Next.js and ReactFlow
- Interactive flow diagram interface for investigation management
- Using Tailwind CSS v4 with CSS-based configuration

## Technology Stack
- **Framework**: Next.js 15.4.1 with React 19
- **Flow Diagrams**: ReactFlow (@xyflow/react)
- **Styling**: Tailwind CSS v4 (uses @theme directive, no config file needed)
- **TypeScript**: Enabled for type safety

## Development Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

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