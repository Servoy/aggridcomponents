# Triage Report — SVY-21513

**Verdict:** PROCEED

## Reported problem
In Servoy 2026.9.0_rc2 with NG Grids 2026.9.1, dragging a record from one grid to another (svyCloud solution) throws:

```
TypeError: Cannot read properties of undefined (reading 'getBoundingClientRect')
    at t.handleDragViewportScroll
    at t.gridDragOver
    ... polyfills (zone.js)
```

The ticket calls it a "polyfill error", but the polyfills frames are only zone.js running the task. The error comes from our own `handleDragViewportScroll`. The ticket doesn't propose a fix.

## Root-cause assessment
`aggrid/projects/nggrids/src/nggrid.ts:136-142` (`NGGridDirective.handleDragViewportScroll`, called from `gridDragOver` in both `datagrid.ts:4916` and `powergrid.ts:2475`):

```ts
this.dragViewport = $event.currentTarget.getElementsByClassName("ag-body-viewport")[0] as HTMLElement;
this.dragViewportHorizontalScrollViewport = $event.currentTarget.getElementsByClassName("ag-body-horizontal-scroll-viewport")[0] as HTMLElement;
this.dragViewportRect = this.dragViewport.getBoundingClientRect();   // <- throws
```

The package now uses **AG Grid 36** (`node_modules/ag-grid-community` 36.1.0, upgraded in `e030b6b` SVY-21274). AG Grid 36 changed the grid body DOM:
- The CSS class `ag-body-viewport` **no longer exists anywhere** in ag-grid-community 36 (JS or CSS). The same goes for `ag-center-cols-viewport` and `ag-header-viewport`.
- The body scroll container is now `div.ag-grid-viewport` (`ref: eGridViewport`, `overflow:auto`), inside `.ag-root` (see `getGridBodyTemplate` in `main.esm.mjs`).
- `ag-body-horizontal-scroll-viewport` still exists. It's the separate horizontal scrollbar proxy.

So `getElementsByClassName("ag-body-viewport")[0]` is `undefined`, and the code crashes on the first `dragover` over any grid while a `nggrids-drag/json` drag is running. That's every grid-to-grid drag, and also drags within the same grid. The drag-over and drop handling after it (`onDragOver` callback, `dropEffect`, `preventDefault`) never runs, so the drop is effectively broken, not just noisy.

This is a regression in our code caused by the AG Grid 36 upgrade. It's not a bug in the polyfills, Servoy core, or AG Grid. The legacy AngularJS files don't use this code. No other DOM class lookups in `src/` refer to removed AG Grid classes. The only other one is `.ag-header-cell-label`, which still exists.

## Ticket premise check
The title ("pollyfill error") is misleading. zone.js just shows up in the stack. The real problem is a stale AG Grid CSS class selector in `nggrid.ts`. The ticket doesn't propose a solution, so there's nothing to reject.

## Approaches considered
1. **Update the selectors for the AG Grid 36 DOM**: use `.ag-grid-viewport` for the vertical (and possibly horizontal) scroll container. Add null guards so a missing element never throws, and skip auto-scroll instead.
   Pros: small, local fix that restores DnD and auto-scroll. Cons: still depends on AG Grid's internal DOM class names, which may change again.
2. **Null guards only**: if the viewport isn't found, skip auto-scroll.
   Pros: trivial, fixes the exception and drop. Cons: drag auto-scroll (SVY-19056) silently stops working. That's a feature regression.
3. **Scroll through the grid API instead of DOM** (for example `gridApi.ensureIndexVisible`, or reading the viewport through a documented API) and use the `ag-root-wrapper` rect for the edge detection.
   Pros: less tied to AG Grid internals. Cons: bigger change, and row-based scrolling behaves differently from the current pixel-smooth scroll.
4. **No code change**: rejected. It's a real regression that breaks grid DnD for customers on 2026.9.x.

## Recommendation
**PROCEED with approach 1** (and include the null guards from approach 2 as defense):
- In `handleDragViewportScroll`, look up `.ag-grid-viewport` (the 36 body viewport) instead of `.ag-body-viewport`.
- Check whether horizontal scrolling in AG Grid 36 should go through `.ag-grid-viewport` itself (it's `overflow:auto`) or through the `.ag-body-horizontal-scroll-viewport` proxy. Pick whichever actually moves the columns.
- If an element can't be found, return early without throwing, and don't cache a null rect.
- Add a Vitest unit test for `handleDragViewportScroll`: it shouldn't throw when the elements are missing, and it should pick the correct element with AG Grid 36 markup.

Approach 3 is a possible later hardening.

## Git history findings
- `9613194` (2024-10-25, SVY-19056 "Ability to Scroll when Drag n Dropping record in grid in Titanium") added `handleDragViewportScroll` with the `ag-body-viewport` selector. That was valid for AG Grid ≤35.
- `3d707d8` (SVY-20819) and `248d2e2` (strict TS) made only cosmetic changes to these lines.
- `e030b6b` (2026-07-28, SVY-21274 "upgrade core to angular 22") bumped `ag-grid-angular` and `ag-grid-enterprise` to `^36`. That's what removed the `ag-body-viewport` class and introduced the regression. It shipped in 2026.9.x, which matches the reported versions.
- Linked issue: SCCC-3502 (customer case).
