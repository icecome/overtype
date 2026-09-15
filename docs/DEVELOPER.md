# Developer Guide

This guide covers local development setup and workflows for OverTypePlus.

## Local Development Setup

### Prerequisites

```bash
npm install
```

### Building

Build the project:

```bash
npm run build
```

This builds the library to `dist/`.

Watch mode (rebuilds on file changes):

```bash
npm run watch
```

### Testing

Run all tests:

```bash
npm test
```

Run specific test suites:

```bash
npm run test:main          # Main OverType tests
npm run test:preview       # Preview mode tests
npm run test:links         # Link tests
npm run test:webcomponent  # Web component tests
npm run test:types         # TypeScript definitions
```

## Running the Demo Frontend

The React demo frontend lives in `packages/editor`. From the monorepo root:

```bash
npm run dev            # Start the editor frontend at http://localhost:5173
npm run dev:editor     # Explicit alias for the same command
npm run build:editor   # Build the frontend to packages/editor/dist (deployable static files)
```

## Project Structure

```
overtype/
├── src/              # Source files
│   ├── overtype.js
│   ├── parser.js
│   ├── styles.js
│   ├── toolbar.js
│   ├── link-tooltip.js
│   └── overtype-webcomponent.js
├── dist/             # Built files (generated)
├── test/             # Test files
├── scripts/          # Build scripts
└── docs/             # Documentation
```

## Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run build` to build the library
3. Run `npm test` to verify changes
4. Run `npm run dev` (monorepo root) to open the editor frontend
5. Commit your changes

## Contributing

- All TypeScript definitions must pass `npm run test:types`
- All tests must pass before committing
- Follow the existing code style
- Update CHANGELOG.md for notable changes
