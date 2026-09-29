# Project Context â€” Servoy NG Grids (Angular)

This project is the **Servoy NG Grids** package â€” a set of AG Grid-based Angular
components for the Servoy NGClient runtime. It is built as an Angular library using
ng-packagr and deployed as a Servoy web package.

## Technology stack

| Aspect | Value |
|--------|-------|
| Angular version | 22.0.8 |
| TypeScript version | 6.0.3 |
| Build system | Angular CLI + ng-packagr 22.0.2 |
| Test framework | Vitest 4 (Angular TestBed) |
| Linting | ESLint 10.x with @angular-eslint + @typescript-eslint |
| Module system | ES modules (moduleResolution: "bundler") |
| Package name | @servoy/nggrids |
| Version | 2026.9.0 |

## Architecture: Dual-Layer Component Structure

Each grid component exists in **two layers**:

### Layer 1: Servoy Component Spec (`aggrid/<name>/`)
Top-level directories contain the **Servoy spec definition** and legacy assets:

| File | Purpose |
|------|---------|
| `<name>.spec` | Servoy component specification (JSON) â€” defines name, model properties, handlers, API methods, types |
| `<name>.js` | Legacy AngularJS client-side code |
| `<name>.html` | Legacy AngularJS template |
| `<name>.css` | Component styles |
| `<name>_server.js` | Server-side scripting |
| `<name>_doc.js` | Documentation/API stubs |

### Layer 2: Angular Library (`aggrid/projects/nggrids/src/<name>/`)
The modern Angular implementations:

| File | Purpose |
|------|---------|
| `<name>.ts` | Angular component class |
| `<name>.html` | Angular template |
| `<name>.service.ts` | Component service (grid state, event handling) |
| `<name>.cy.ts` | Cypress component test |

## Components

| Component | Type | Layer 1 (Spec) | Layer 2 (Angular) |
|-----------|------|----------------|-------------------|
| **Power Grid** | Dataset-based grid | `datasettable/datasettable.spec` | `projects/nggrids/src/powergrid/` |
| **Data Grid** | Foundset-based grid | `groupingtable/groupingtable.spec` | `projects/nggrids/src/datagrid/` |
| **datasettable** | AngularJS Power Grid | `datasettable/` | â€” (JS only) |
| **groupingtable** | AngularJS Data Grid | `groupingtable/` | â€” (JS only) |

**Important shared specs:** Unlike servoy-extra-components where each component has its own spec:
- `datasettable/datasettable.spec` + `datasettable_doc.js` â†’ powergrid (Angular) + datasettable (AngularJS)
- `groupingtable/groupingtable.spec` + `groupingtable_doc.js` â†’ datagrid (Angular) + groupingtable (AngularJS)

## Angular Component Pattern

Components follow these conventions:
- **Selector prefix:** `aggrid-` (kebab-case, enforced by ESLint)
- **Directive selector prefix:** `aggrid` (camelCase)
- **Base class:** Both grids extend `NGGridComponent` from `nggrid.ts`
- **Standalone:** `false` â€” all components declared in `NGGridsModule`
- **Change detection:** `ChangeDetectionStrategy.OnPush`
- **Service pattern:** Each grid has a companion service (e.g., `powergrid.service.ts`)
  that manages AG Grid state and event handling
- **AG Grid integration:** Uses `ag-grid-angular` with enterprise features

## Key project structure

```
aggridcomponents/
â”œâ”€â”€ aggrid/                              # Main working directory
â”‚   â”œâ”€â”€ angular.json                     # Angular workspace config
â”‚   â”œâ”€â”€ package.json                     # Dependencies & scripts
â”‚   â”œâ”€â”€ tsconfig.json                    # Root TypeScript config
â”‚   â”œâ”€â”€ .eslintrc.json                   # ESLint config
â”‚   â”œâ”€â”€ cypress.config.ts                # Cypress component testing config
â”‚   â”œâ”€â”€ projects/
â”‚   â”‚   â”œâ”€â”€ nggrids/                     # Angular library project
â”‚   â”‚   â”‚   â”œâ”€â”€ ng-package.json
â”‚   â”‚   â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ public-api.ts        # Library exports
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ nggrids.module.ts    # NgModule declarations
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ nggrid.ts            # Shared grid base class
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ testingutils.ts      # Test utilities
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ powergrid/           # Power Grid (Angular)
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ datagrid/            # Data Grid (Angular)
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ editors/             # Shared cell editors
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ filters/             # Shared column filters
â”‚   â”‚   â””â”€â”€ dummy/                       # Dummy app (dev/testing scaffold)
â”‚   â”œâ”€â”€ datasettable/                    # Servoy spec + AngularJS Power Grid
â”‚   â”œâ”€â”€ groupingtable/                   # Servoy spec + AngularJS Data Grid
â”‚   â”œâ”€â”€ lib/                             # Shared utilities
â”‚   â””â”€â”€ scripts/build.js                 # Release packaging script
â”œâ”€â”€ webpackage.json                      # Servoy package manifest
â””â”€â”€ README.md
```

## Key dependencies

| Package | Purpose |
|---------|---------|
| `@servoy/public` | Servoy framework base classes and utilities |
| `ag-grid-angular` | AG Grid Angular wrapper |
| `ag-grid-enterprise` | AG Grid Enterprise features (grouping, pivoting, server-side row model) |
| `@ng-bootstrap/ng-bootstrap` | Bootstrap widgets for Angular |
| `@angular/cdk` | Angular CDK utilities |
| `@eonasdan/tempus-dominus` | Date picker (cell editors) |
| `@popperjs/core` | Positioning (tooltips, popups) |
| `lodash-es` | Utility functions |
| `luxon` | Date/time handling |

## Build commands

| Command | Action |
|---------|--------|
| `npm run build` | Production build of the library |
| `npm run build_debug` | Build with watch mode |
| `npm run make_release` | Build + package into aggrid.zip |

## Testing

- **Framework:** Vitest 4 (Angular TestBed)
- **Commands:** `npm run test_headless` (single run) / `npm run test` (watch)
- **Cypress:** `npm run cy:open` (interactive) / `npm run cy:run` (headless)
- **Pattern:** Each component has a `<name>.cy.ts` file alongside its implementation

## Linting

- ESLint with `eslint:recommended`, `@typescript-eslint/recommended`, `@angular-eslint/recommended`
- All rules emit warnings (uses `eslint-plugin-only-warn`)
- Single quotes, max 200 char lines, 1TBS brace style
- Run: `npm run lint` from the `aggrid/` directory

## Code conventions

- Follow existing patterns in neighboring components â€” consistency over personal preference
- Use the `@servoy/public` base classes and utilities â€” never reinvent what's already provided
- Component selectors must use the `aggrid-` prefix
- No console.log in production code
- Prefer existing utility functions from `@servoy/public` and `lodash-es`
- Always update `public-api.ts` when adding new exports
- Always update `nggrids.module.ts` when adding new components/directives

## Gotchas

- **The .spec file is NOT a test file.** It's the Servoy component specification (JSON)
  that defines the component's contract â€” model properties, handlers, API methods, types.
  Changes to the component contract REQUIRE updating this file.

- **Shared specs:** `datasettable.spec` covers BOTH the AngularJS datasettable AND the
  Angular powergrid. Same for `groupingtable.spec` â†’ groupingtable + datagrid.

- **Dual-layer sync:** When changing component properties or API, the `.spec` file,
  `_doc.js` file, Angular component, and AngularJS implementation must all be updated.

- **ng-packagr:** The library is built with ng-packagr. If adding a new component, it
  must be declared in `nggrids.module.ts` and exported in `public-api.ts`.

- **@servoy/public version coupling:** This package is tightly coupled to a specific
  Servoy platform version. The `@servoy/public` version must match the target runtime.

- **Legacy AngularJS files still exist:** The `.js` and `.html` files in `datasettable/`
  and `groupingtable/` are legacy AngularJS implementations kept for older Servoy
  runtime compatibility. New features should focus on the Angular implementation but
  may also need AngularJS updates.

- **AG Grid Enterprise:** The components use enterprise-only features (row grouping,
  pivoting, server-side row model). Ensure proper imports and license handling.

- **Service pattern:** Changes often span both the component (`.ts`) and its service
  (`.service.ts`). The service manages AG Grid API interactions.

- **OnPush change detection:** All components use `ChangeDetectionStrategy.OnPush`.
  Ensure proper change detection triggering when modifying state.
