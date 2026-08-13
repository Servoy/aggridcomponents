---
name: test-migration
description: "Use when the user wants to migrate component tests from Karma/Jasmine to Vitest, or clean up legacy test infrastructure (Karma, Jasmine, Cypress). Triggered by 'test migration', 'migrate tests', 'karma to vitest', 'convert tests', 'remove karma', or 'clean up test framework'."
---

# Test Migration — Karma/Jasmine to Angular Vitest

You are a **test framework migration agent** for the Servoy NG Grids project. Your job is
to convert Karma/Jasmine tests to Angular Vitest tests and clean up legacy test infrastructure.

## Context

This project currently uses Karma + Jasmine for unit tests and Cypress for component tests.
Angular 22 uses Vitest as the official test framework via `@angular/build:unit-test` builder.
Tests use Angular's `TestBed` with jsdom (or optionally real browsers via `--browsers`).

## Infrastructure Setup

Check whether the Vitest infrastructure is already configured by looking for:
- A `test` target in `angular.json` using `@angular/build:unit-test`
- `vitest` in `package.json` devDependencies
- A `vitest-base.config.ts` file

If any of these are missing, run the full setup below. If all are present, skip to Phase 2.

### Phase 1 — Infrastructure Setup

#### 1.1 Install Vitest dependencies

```bash
npm install --save-dev vitest jsdom @types/luxon
```

`@types/luxon` is required by `@servoy/public` type definitions.

#### 1.2 Update test target in angular.json

Replace the existing Karma test target with Vitest:

```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "tsConfig": "projects/nggrids/tsconfig.spec.json",
    "buildTarget": "dummy:build",
    "runnerConfig": "vitest-base.config.ts"
  }
}
```

**Important:** Libraries need a `buildTarget` pointing to an application project since
`@angular/build:unit-test` needs an application build context. Use the `dummy` project.

#### 1.3 Create or update tsconfig.spec.json

The tsconfig for tests should extend the root tsconfig and include `.spec.ts` files:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/spec",
    "types": []
  },
  "files": [],
  "include": [
    "src/**/*.spec.ts",
    "src/**/*.ts",
    "src/**/*.d.ts"
  ],
  "exclude": [
    "src/**/*.cy.ts"
  ]
}
```

The `exclude` for `*.cy.ts` is only needed while old Cypress files still exist.

#### 1.4 Create vitest-base.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    deps: {
      inline: []
    }
  }
});
```

Add any problematic CommonJS packages to `deps.inline` as you encounter them.

#### 1.5 Add test scripts to package.json

```json
"test": "ng test @servoy/nggrids --no-watch",
"test:watch": "ng test @servoy/nggrids",
"test:ui": "ng test @servoy/nggrids --ui"
```

#### 1.6 Verify infrastructure

Run the test command. It should either pass with 0 tests or fail only because no
`.spec.ts` files exist yet (not because of config errors):

```bash
npx ng test @servoy/nggrids --no-watch
```

## Input

The user provides:
- A specific component name (e.g., `powergrid`, `datagrid`) OR `all` to migrate everything
- Optionally `setup` to only configure the infrastructure without converting tests
- Optionally `cleanup` to only remove Karma/Jasmine/Cypress remnants

## Process

### Phase 2 — Convert Test Files

For each `.cy.ts` file (Cypress) or existing Karma test, create a corresponding Vitest
`.spec.ts` file with equivalent test coverage.

#### Proven working pattern (Direct Component Testing)

**DO NOT use a WrapperComponent pattern.** Use direct component instantiation:

```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServoyApiTesting, ServoyPublicTestingModule } from '@servoy/public';
import { PowerGrid } from './powergrid';

describe('PowerGrid', () => {
    let fixture: ComponentFixture<PowerGrid>;
    let component: PowerGrid;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PowerGrid],
            imports: [ServoyPublicTestingModule, FormsModule],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(PowerGrid);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting());
        fixture.componentRef.setInput('enabled', true);
        // ... other inputs

        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
```

#### Why this pattern works

1. **`fixture.componentRef.setInput()`** — sets signal inputs properly via the Angular
   framework's input binding mechanism.

2. **`declarations: [TheComponent]`** — declare only the component under test. Since
   `NGGridsModule` already declares it, you CANNOT import the full module AND declare
   the component (double declaration error).

3. **`schemas: [NO_ERRORS_SCHEMA]`** — suppresses unknown element/attribute errors for
   child components in templates.

4. **`ServoyPublicTestingModule`** — provides mock implementations of Servoy services.

5. **No `NGGridsModule` import** — avoids pulling in all grid components and their
   heavy AG Grid dependencies.

#### Conversion mapping (Cypress → Vitest)

| Cypress | Vitest + TestBed |
|---------|-----------------|
| `cy.mount(Comp, { declarations: [...], imports: [...] })` | `TestBed.configureTestingModule({ declarations: [Comp], imports: [...], schemas: [NO_ERRORS_SCHEMA] })` |
| `cy.get('selector')` | `fixture.nativeElement.querySelector('selector')` |
| `cy.get('selector').should('exist')` | `expect(el).not.toBeNull()` |
| `cy.get('selector').should('have.class', x)` | `expect(el.classList.contains(x)).toBe(true)` |
| `cy.get('selector').click()` | `el.click(); fixture.detectChanges(); await fixture.whenStable()` |
| `cy.stub()` | `vi.fn()` |
| `cy.wrap(stub).should('be.called')` | `expect(spy).toHaveBeenCalled()` |

#### Conversion mapping (Jasmine → Vitest)

| Jasmine | Vitest |
|---------|--------|
| `jasmine.createSpy('name')` | `vi.fn()` |
| `spyOn(obj, 'method')` | `vi.spyOn(obj, 'method')` |
| `expect(x).toEqual(y)` | `expect(x).toEqual(y)` (same) |
| `expect(x).toBe(y)` | `expect(x).toBe(y)` (same) |
| `expect(spy).toHaveBeenCalledWith(x)` | `expect(spy).toHaveBeenCalledWith(x)` (same) |
| `beforeEach(async () => {...})` | `beforeEach(async () => {...})` (same) |
| (implicit imports) | `import { describe, it, expect, beforeEach, vi } from 'vitest'` |

#### Per-component verification

After converting each test file:
```bash
npx ng test @servoy/nggrids --no-watch --include "projects/nggrids/src/<name>/<name>.spec.ts"
```

Fix any failures before moving to the next component.

---

### Phase 3 — Cleanup

After all tests are converted and passing:

#### 3.1 Remove Cypress files

```
DELETE: cypress.config.ts
DELETE: cypress/ (entire directory)
DELETE: all *.cy.ts files
```

#### 3.2 Remove Cypress dependencies from package.json

Remove from `devDependencies`:
- `cypress`

Remove scripts:
- `cy:open`
- `cy:run`

#### 3.3 Remove Karma/Jasmine from package.json

Remove from `devDependencies`:
- `@types/jasmine`
- `jasmine`
- `jasmine-core`
- `jasmine-spec-reporter`
- `karma`
- `karma-chrome-launcher`
- `karma-cli`
- `karma-coverage`
- `karma-jasmine`
- `karma-jasmine-html-reporter`
- `karma-junit-reporter`
- `@chiragrupani/karma-chromium-edge-launcher`

Remove scripts:
- `test_edge`
- `test_edge_nowatch`

Update scripts:
- `test` → `ng test @servoy/nggrids --no-watch`
- `test_headless` → `ng test @servoy/nggrids --no-watch`

#### 3.4 Remove Karma config files

```
DELETE: projects/nggrids/karma.conf.js
DELETE: projects/nggrids/src/test.ts (Karma bootstrap)
```

#### 3.5 Update tsconfig.spec.json

Remove the `"exclude": ["src/**/*.cy.ts"]` entry (no longer needed).

#### 3.6 Run npm install

```bash
npm install
```

#### 3.7 Final verification

```bash
npm run build
npm run lint
npm run test
```

All three must pass.

---

### Phase 4 — Update AGENTS.md

After migration, update the `AGENTS.md` documentation to reflect the new test setup:

- Change test framework from "Karma + Jasmine" to "Vitest (via @angular/build:unit-test)"
- Update test commands table
- Remove Cypress commands
- Update test file pattern
- Document the direct component testing pattern

---

### Phase 5 — Update GitHub Actions workflow

Check for a `.github/workflows/` file that runs Karma or Cypress tests.
Replace with a Vitest-based workflow:

```yaml
name: Run the vitest component tests

on:
  push:
    branches:
      - master
      - 20**
      - v20**
  workflow_dispatch:
  workflow_call:

jobs:
  build:

      runs-on: ubuntu-latest

      steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Find component directory
        id: find_component_dir
        run: echo "COMPONENT_DIR=$(find . -type d -name 'META-INF' -exec dirname {} \;)" >> $GITHUB_ENV

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'

      - name: Cache + Restore node_modules
        uses: actions/cache@v4
        with:
          path: |
              ${{ env.COMPONENT_DIR }}/.angular
              ${{ env.COMPONENT_DIR }}/node_modules
          key: ${{ runner.os }}-node_modules-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node_modules-

      - name: Install and run the vitest component tests
        working-directory: ${{ env.COMPONENT_DIR }}
        run: |
          npm install
          npm run test
```

---

## Execution strategy

When converting `all` components, process them in this order:

1. `powergrid` — primary Angular grid component
2. `datagrid` — secondary Angular grid component

These are the only two Angular components with test files. The AngularJS components
(datasettable, groupingtable) do not have Angular test files.

## Important notes & lessons learned

- **This is a library project.** The `@angular/build:unit-test` builder needs a `buildTarget`
  pointing to an application (`dummy:build`). This is how Angular CLI handles library testing.
- **jsdom is usually sufficient.** Most component tests check DOM state and events — they
  don't need real CSS rendering. Only use `--browsers` for layout-dependent tests.
- **AG Grid in tests:** AG Grid may need special handling in jsdom. If grid rendering fails,
  consider mocking the AG Grid component or using `NO_ERRORS_SCHEMA`.
- **DO NOT import `NGGridsModule` in tests.** It pulls in all grid components and AG Grid
  dependencies. Instead, declare only the component under test.
- **DO NOT use a WrapperComponent.** Use direct `TestBed.createComponent(TheComponent)`.
- **Use `fixture.componentRef.setInput('name', value)`** for signal inputs.
- **Use `NO_ERRORS_SCHEMA`** to suppress unknown element/attribute warnings.
- **`ServoyPublicTestingModule`** provides mock Servoy services. Always import it.
- **The `.spec` JSON files are NOT test files.** Don't confuse Servoy `.spec` files with
  test `.spec.ts` files. The Vitest include pattern `**/*.spec.ts` only matches TypeScript files.
