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

### Critical: Global Mocking Rules

- **NEVER** use `vi.stubGlobal('document', ...)` or `vi.stubGlobal('window', ...)` — this replaces the entire jsdom DOM and breaks ALL subsequent tests in the same fork/thread. The error manifests as `this.doc.querySelector is not a function` in Angular's renderer.
- Instead, mock individual methods and restore them:
  ```typescript
  let originalMethod: typeof document.elementFromPoint;
  beforeEach(() => {
    originalMethod = document.elementFromPoint;
    document.elementFromPoint = vi.fn() as any;
  });
  afterEach(() => {
    document.elementFromPoint = originalMethod;
  });
  ```
- Similarly, never replace `window.location`, `window.navigator` etc. via `stubGlobal` — use `vi.spyOn` or direct property assignment with restore.

### Debugging: Log First, Fix Later

When facing unclear test failures (locally or on CI), **do NOT spend multiple rounds guessing root causes**. Instead:

1. **Add diagnostic logging immediately** — log the state of the failing object (e.g. `typeof`, `constructor.name`, `Object.keys()`, `JSON.stringify`) at the point of failure
2. **Run (or push and let CI run)** — get real data from the actual environment
3. **Fix based on evidence** — one log statement that shows actual state is worth more than three speculative fixes

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
