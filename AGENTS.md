# AGENTS.md — Servoy NG Grids

## Project overview

This repository contains the **Servoy NG Grids** package — a set of AG Grid-based
components for the Servoy NGClient runtime. Components are built as an Angular library
and deployed as a Servoy web package (`.zip`).

**Repository:** https://github.com/Servoy/aggridcomponents
**Package name:** `@servoy/nggrids`
**Current version:** 2024.3.12

## Technology stack

| Aspect | Value |
|--------|-------|
| Angular | 17.2.1 |
| TypeScript | 5.3.3 |
| Build system | Angular CLI + ng-packagr 17.2.0 |
| Test framework | Karma + Jasmine (headless Chrome) |
| Linting | ESLint 10.x (@angular-eslint + @typescript-eslint) |
| Node package manager | npm |
| Servoy framework | @servoy/public 2024.3.0 |
| AG Grid | @ag-grid-community/angular 31.0.3 + @ag-grid-enterprise/core 31.0.3 |

## Working directory

All npm/ng commands must be run from the `aggrid/` directory:
```
cd aggrid
```

## Build commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build (`ng build @servoy/nggrids --configuration production`) |
| `npm run build_debug` | Build with file watching |
| `npm run make_release` | Production build + package into `aggrid.zip` |

## Lint & typecheck

```bash
npm run lint
```

This runs ESLint with the Angular and TypeScript plugins. All rules emit warnings
(via `eslint-plugin-only-warn`), but warnings should still be addressed.

The build (`npm run build`) performs full TypeScript type checking via ng-packagr.
A successful build confirms type correctness.

## Testing

| Command | Purpose |
|---------|---------|
| `npm run test_headless` | Run all Karma/Jasmine tests (headless Chrome, no watch) |
| `npm run test` | Run tests in watch mode (Chrome) |
| `npm run test_edge` | Run tests in Edge (watch) |
| `npm run cy:open` | Open Cypress interactive runner |
| `npm run cy:run` | Run Cypress component tests headless |

## Architecture

### Dual-layer component structure

Each grid component exists in **two layers** that must stay in sync:

**Layer 1 — Servoy Spec** (`aggrid/<name>/`):
- `<name>.spec` — JSON file defining the Servoy component contract (model properties,
  handlers, API methods, custom types). This is NOT a test file.
- `<name>.js` / `<name>.html` / `<name>.css` — Legacy AngularJS implementation
- `<name>_server.js` — Server-side scripting
- `<name>_doc.js` — Documentation/API stubs
- Icons (`.png`, `@2x.png` variants)

**Layer 2 — Angular Implementation** (`aggrid/projects/nggrids/src/<name>/`):
- `<name>.ts` — Angular component class
- `<name>.html` — Angular template
- `<name>.service.ts` — Component service (grid state, event handling)
- `<name>.cy.ts` — Cypress component test

### Components

| Component | Type | Layer 1 (Spec) | Layer 2 (Angular) |
|-----------|------|----------------|-------------------|
| **Power Grid** | Dataset-based grid | `datasettable/datasettable.spec` | `projects/nggrids/src/powergrid/` |
| **Data Grid** | Foundset-based grid | `groupingtable/groupingtable.spec` | `projects/nggrids/src/datagrid/` |
| **datasettable** | AngularJS Power Grid | `datasettable/` | — (JS only) |
| **groupingtable** | AngularJS Data Grid | `groupingtable/` | — (JS only) |

**Important:** Angular components share spec/doc files with their AngularJS counterparts:
- `datasettable/datasettable.spec` + `datasettable/datasettable_doc.js` → powergrid + datasettable
- `groupingtable/groupingtable.spec` + `groupingtable/groupingtable_doc.js` → datagrid + groupingtable

### Shared code

| Directory | Purpose |
|-----------|---------|
| `projects/nggrids/src/editors/` | Shared cell editors (text, select, date, form) |
| `projects/nggrids/src/filters/` | Shared column filters |
| `projects/nggrids/src/nggrid.ts` | Shared base class for both Angular grids |
| `projects/nggrids/src/nggrids.module.ts` | NgModule declarations |
| `projects/nggrids/src/public-api.ts` | Library exports |
| `aggrid/lib/` | Shared utilities |

### Angular component conventions

- **Selector prefix:** `aggrid-` (kebab-case, enforced by ESLint)
- **Directive selector prefix:** `aggrid` (camelCase)
- **Base class:** Both grids share `NGGridComponent` from `nggrid.ts`
- **Standalone:** `false` — all components declared in `NGGridsModule`
- **Change detection:** `ChangeDetectionStrategy.OnPush`
- **AG Grid integration:** Uses `ag-grid-angular` with enterprise features

### Module registration

When adding a new component:
1. Declare in `nggrids.module.ts`
2. Export in `public-api.ts`
3. Update the relevant Servoy `.spec` file in `datasettable/` or `groupingtable/`

## Code style

- Single quotes (enforced by `@stylistic/ts/quotes`)
- Max line length: 200 characters
- Brace style: 1TBS (`if (x) {`)
- Static readonly properties: UPPER_CASE
- No component class suffix required (`@angular-eslint/component-class-suffix: off`)
- No console.log in production code
- Use `@servoy/public` utilities and `lodash-es` — don't reinvent

## Key dependencies

| Package | Purpose |
|---------|---------|
| `@servoy/public` | Servoy framework base classes, utilities, API types |
| `ag-grid-angular` | AG Grid Angular wrapper |
| `ag-grid-enterprise` | AG Grid Enterprise features (grouping, pivoting, etc.) |
| `@ng-bootstrap/ng-bootstrap` | Bootstrap widgets for Angular |
| `@angular/cdk` | Angular CDK utilities |
| `@eonasdan/tempus-dominus` | Date picker (cell editors) |
| `@popperjs/core` | Positioning (tooltips, popups) |
| `lodash-es` | Utility functions |
| `luxon` | Date/time handling |

## Project structure

```
aggridcomponents/
├── AGENTS.md                            # This file
├── JIRA.md                              # Jira API reference
├── opencode.json                        # opencode configuration
├── README.md                            # Basic setup instructions
├── .opencode/                           # opencode skills & plugins
│   ├── skills/sdd/                      # Spec-Driven Development pipeline
│   ├── skills/spec-sync/                # Spec sync checker
│   ├── skills/migration/                # Angular modernization
│   ├── skills/test-migration/           # Karma → Vitest migration
│   └── plugins/commit-lint.ts           # Commit message validation
├── aggrid/                              # Main working directory
│   ├── angular.json                     # Angular workspace config
│   ├── package.json                     # npm dependencies & scripts
│   ├── tsconfig.json                    # Root TypeScript config
│   ├── .eslintrc.json                   # ESLint config
│   ├── cypress.config.ts                # Cypress component testing config
│   ├── scripts/build.js                 # Release packaging (creates .zip)
│   ├── projects/
│   │   ├── nggrids/                     # Angular library
│   │   │   ├── ng-package.json          # ng-packagr config
│   │   │   ├── tsconfig.lib.json        # Library TS config
│   │   │   ├── tsconfig.lib.prod.json   # Production TS config
│   │   │   ├── tsconfig.spec.json       # Test TS config
│   │   │   ├── karma.conf.js            # Karma configuration
│   │   │   └── src/
│   │   │       ├── public-api.ts        # Library exports
│   │   │       ├── nggrids.module.ts    # NgModule declarations
│   │   │       ├── nggrid.ts            # Shared grid base class
│   │   │       ├── testingutils.ts      # Test utilities
│   │   │       ├── powergrid/           # Power Grid (Angular)
│   │   │       ├── datagrid/            # Data Grid (Angular)
│   │   │       ├── editors/             # Shared cell editors
│   │   │       └── filters/             # Shared column filters
│   │   └── dummy/                       # Dummy app (dev/testing scaffold)
│   ├── datasettable/                    # Servoy spec + AngularJS Power Grid
│   ├── groupingtable/                   # Servoy spec + AngularJS Data Grid
│   ├── lib/                             # Shared utilities
│   ├── dist/                            # Build output (gitignored)
│   └── node_modules/                    # Dependencies (gitignored)
├── svyGroupingGrid_test/                # Test solution
├── svyGroupingGridDemo/                 # Demo solution
└── webpackage.json                      # Servoy package manifest & release history
```

## Workflow

### Post-edit checklist

After making code changes, always verify:
1. `npm run build` — must compile without errors
2. `npm run lint` — check for lint warnings
3. Run relevant tests: `npm run test_headless`
4. If `package.json` dependencies were changed, verify distribution package is in sync

### Commit message format

```
<JIRA_KEY> <short description> [ai]

- bullet points summarising changes

Co-Authored-By: opencode <noreply@opencode.ai>
```

Example: `SVY-22100 fix power grid column resize on grouped rows [ai]`

### Modifying a component

When changing component properties, handlers, or API:
1. Update the `.spec` file (JSON contract) in `datasettable/` or `groupingtable/`
2. Update the `_doc.js` file with new API documentation
3. Update the Angular component in `projects/nggrids/src/<powergrid|datagrid>/`
4. If it affects AngularJS too, update the `.js` file in `datasettable/` or `groupingtable/`
5. All layers must stay in sync

## Gotchas

- **`.spec` files are NOT tests.** They're Servoy component specification JSON files.
- **Shared specs:** Unlike servoy-extra-components where each component has its own spec,
  here `datasettable.spec` covers BOTH the AngularJS datasettable AND the Angular powergrid.
  Same for `groupingtable.spec` → groupingtable + datagrid.
- **AG Grid Enterprise.** The components use enterprise-only features (row grouping, pivoting,
  server-side row model). Ensure the AG Grid license and imports are correct.
- **@servoy/public version coupling.** Must match the target Servoy runtime version.
- **Legacy files still active.** The AngularJS files in `datasettable/` and `groupingtable/`
  are still used by older Servoy runtimes. Don't delete them.
- **Base class hierarchy:** Both Angular grids extend `NGGridComponent` (in `nggrid.ts`),
  which extends `ServoyBaseComponent` from `@servoy/public`.
- **Service pattern:** Each Angular grid has a companion service (e.g., `powergrid.service.ts`)
  that manages AG Grid state and event handling. Changes often span both the component and service.
