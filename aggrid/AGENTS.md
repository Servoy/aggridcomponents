# Workspace: Servoy AG-Grid Components

## Build

```bash
npm run build
```

Runs `ng build --configuration production`. Required after any TypeScript change in `projects/nggrids/src/`.
AngularJS components (`datasettable/`, `groupingtable/`) have no build step.

## Lint

```bash
npm run lint
```

Runs `ng lint` (ESLint via @angular-eslint).

## Test

```bash
npm run test_headless
```

Runs Karma + Jasmine in headless Chrome (no watch).

## Project Structure

```
aggrid/
├── projects/nggrids/src/          # Angular library (TypeScript)
│   ├── powergrid/                 # Power Grid (dataset-based)
│   ├── datagrid/                  # Data Grid (foundset-based)
│   ├── editors/                   # Shared cell editors
│   ├── filters/                   # Shared column filters
│   └── nggrid.ts                  # Shared base class
├── datasettable/                  # AngularJS Power Grid (JavaScript)
├── groupingtable/                 # AngularJS Data Grid (JavaScript)
└── opencode.json                  # opencode config with /grid commands
```

## Conventions

- Do not add code comments unless explicitly asked
- Angular components share spec/doc files with their AngularJS counterparts:
  - `datasettable/datasettable.spec` + `datasettable_doc.js` → powergrid + datasettable
  - `groupingtable/groupingtable.spec` + `groupingtable_doc.js` → datagrid + groupingtable
- When modifying model/handlers/api: always update spec + doc + implementation together
