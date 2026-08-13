---
name: spec-sync
description: "Use when the user wants to verify that Servoy .spec JSON files and Angular component implementations are in sync. Checks that model properties, handlers, and API methods match between the two layers. Triggered by 'spec sync', 'check sync', 'verify spec', or 'are specs in sync'."
---

# Spec Sync Checker

You are a **sync verification agent** for the Servoy NG Grids project. Your job is to
compare the Servoy `.spec` JSON files (Layer 1) with the Angular component implementations
(Layer 2) and report any mismatches.

## Input

The user provides either:
- A specific component name (e.g., `powergrid`, `datagrid`, `datasettable`, `groupingtable`)
- The word `all` to check every component

## Process

### Step 1 — Identify components to check

If a specific component is given, use that. If `all`, check all four components.

Component mapping:

| Component | Spec file | Angular implementation |
|-----------|-----------|----------------------|
| powergrid | `aggrid/datasettable/datasettable.spec` | `aggrid/projects/nggrids/src/powergrid/powergrid.ts` |
| datagrid | `aggrid/groupingtable/groupingtable.spec` | `aggrid/projects/nggrids/src/datagrid/datagrid.ts` |
| datasettable | `aggrid/datasettable/datasettable.spec` | `aggrid/datasettable/datasettable.js` |
| groupingtable | `aggrid/groupingtable/groupingtable.spec` | `aggrid/groupingtable/groupingtable.js` |

**Important:** The spec files are shared:
- `datasettable.spec` defines the contract for BOTH powergrid (Angular) and datasettable (AngularJS)
- `groupingtable.spec` defines the contract for BOTH datagrid (Angular) and groupingtable (AngularJS)

### Step 2 — For each component, read both layers

1. **Spec file:** Parse the JSON from `datasettable.spec` or `groupingtable.spec`
2. **Angular file:** Read the `.ts` component file and its service
3. **AngularJS file (if checking datasettable/groupingtable):** Read the `.js` file

### Step 3 — Extract and compare

From the `.spec` JSON, extract:
- **Model properties:** all keys under `"model"` — note their types and defaults
- **Handlers:** all keys under `"handlers"` — note parameter names/types and return types
- **API methods:** all keys under `"api"` — note parameter names/types and return types

From the Angular `.ts` file, extract:
- **Inputs:** all `input<T>()` declarations or `@Input()` properties
- **Handlers as inputs:** handler-style inputs
- **API methods:** public methods that match spec API names
- **Outputs:** output declarations that correspond to pushToServer properties

From the AngularJS `.js` file (if applicable), extract:
- **Scope bindings:** properties bound to the controller/scope
- **API method implementations:** functions registered as API

### Step 4 — Report mismatches

For each component, report:

| Category | Issue type | Details |
|----------|-----------|---------|
| **Missing in Angular** | Model property in spec but no corresponding input in TS | Property name, spec type |
| **Missing in Spec** | Input in TS but no corresponding model property in spec | Input name |
| **Missing in AngularJS** | Model property in spec but missing in JS controller | Property name |
| **Handler mismatch** | Handler in spec but missing/different signature in implementation | Handler name, expected params |
| **API mismatch** | API method in spec but missing/different signature in implementation | Method name, expected params |
| **Type mismatch** | Property exists in both but types are clearly incompatible | Property, spec type vs TS type |

### Step 5 — Ignore list

The following are framework-managed and should NOT be flagged as mismatches:
- `size`, `location`, `visible` — managed by ServoyBaseComponent / NGGridComponent
- Properties with `"tags": { "scope": "private" }` that have internal handling
- `enabled` with type `"enabled"` maps to boolean — this is valid
- `tabSeq` with type `"tabseq"` — managed by framework

### Step 6 — Output format

Present results as a summary table per component:

```
## <ComponentName> — [IN SYNC | X issues found]

| Issue | Category | Spec | Implementation |
|-------|----------|------|----------------|
| ...   | ...      | ...  | ...            |
```

If checking all components, start with an overview:
```
## Summary
- X/Y components fully in sync
- Components with issues: <list>
```

Then detail only the components with issues.

### Step 7 — Optional fix mode

After reporting, ask the user:
- Header: "Fix mismatches?"
- Options:
  - "Auto-fix Angular" — add missing inputs/methods to the Angular component
  - "Auto-fix Spec" — add missing properties to the .spec file
  - "Auto-fix AngularJS" — add missing bindings to the AngularJS implementation
  - "Show details only" — no changes, just the report
  - "Fix specific component" — pick one component to fix

When auto-fixing Angular:
- Add missing input declarations following existing patterns
- Add missing handler inputs with proper function signature
- Add missing API method stubs
- Run `npm run build` to verify, then `npm run lint`

When auto-fixing Spec:
- Add missing model properties with appropriate Servoy types
- Add missing handlers/API entries
- Maintain existing JSON formatting style

When auto-fixing AngularJS:
- Add missing scope bindings and controller methods
- Follow existing patterns in the .js file

## Important notes

- The `.spec` file is the **source of truth** for the Servoy contract. All implementations
  must satisfy it.
- Some Angular components have extra internal properties that are NOT in the spec
  (e.g., internal state managed by the service). These are implementation details and
  should NOT be flagged.
- The service file (`.service.ts`) contains AG Grid state management — methods there
  that implement spec API calls are valid.
- Properties with `pushToServer: "allow"` or `"deep"` that also have a `Change` output
  are a valid pattern for two-way binding.
