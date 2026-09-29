# Spec: SVY-21513 — Grid-to-grid drag throws in handleDragViewportScroll (AG Grid 36)

## 1. Goal
Fix drag and drop in the NG Grids (Data Grid and Power Grid) on AG Grid 36. Every `dragover` during a `nggrids-drag/json` drag currently throws `TypeError: Cannot read properties of undefined (reading 'getBoundingClientRect')` in `NGGridDirective.handleDragViewportScroll`. Because of that, the drag-over and drop handling after it never runs. The fix brings back both the drop and the drag auto-scroll added in SVY-19056.

## 2. Background
### 2.1 Current behaviour
`aggrid/projects/nggrids/src/nggrid.ts` `handleDragViewportScroll($event)` is called from `gridDragOver` in `datagrid.ts` (~4916) and `powergrid.ts` (~2475). On the first call it caches:
- `dragViewport` = `.ag-body-viewport` (used for vertical `scrollBy`)
- `dragViewportHorizontalScrollViewport` = `.ag-body-horizontal-scroll-viewport` (used for horizontal `scrollBy`)
- `dragViewportRect` = `dragViewport.getBoundingClientRect()` (this is where it throws)

It then starts a `setInterval` that scrolls when the pointer is within `dragViewportScrollThreshold` (20px) of an edge. The drag-end cleanup (lines ~183-191) clears the interval and the cached fields.

### 2.2 AG Grid 36 DOM changes
- `ag-body-viewport` no longer exists in ag-grid-community 36.
- The body scroll container is now `div.ag-grid-viewport`. Its CSS is `overflow:auto` with native scrollbars hidden, so it scrolls both vertically and horizontally.
- `.ag-body-horizontal-scroll-viewport` still exists. It is the visible horizontal scrollbar proxy (`overflow-x:scroll`), and AG Grid keeps it in sync with the grid viewport.

### 2.3 Git history
- `9613194` (SVY-19056) added `handleDragViewportScroll` with the `ag-body-viewport` selector. That selector was valid for AG Grid ≤35.
- `3d707d8` (SVY-20819) and `248d2e2` (strict TS) only made cosmetic changes.
- `e030b6b` (SVY-21274) upgraded to `ag-grid-*` `^36`, which introduced the regression (shipped in 2026.9.x).
- Customer case: SCCC-3502.

## 3. Design
### 3.1 Element lookup
- Vertical scroll target and edge-detection rect: `.ag-grid-viewport`, looked up under `$event.currentTarget`.
- Horizontal scroll target: the implementer must check in a running grid (or in the AG Grid 36 source) which element actually moves the center columns.
  - Preferred: `.ag-grid-viewport` itself, since it is `overflow:auto` and AG Grid syncs the proxy scrollbar from it.
  - Fallback: `.ag-body-horizontal-scroll-viewport`, if scrolling the viewport horizontally does not move the columns.
- Keep the existing field names so the cleanup code stays unchanged.

### 3.2 Null safety
- If the viewport element is not found, return early without throwing and without starting an interval.
- Do not cache `null`/`undefined` into `dragViewport` or `dragViewportRect`. A later `dragover` must be able to retry the lookup.
- Guard the horizontal target before calling `scrollBy`.
- `$event.currentTarget` may be null. In that case, return early.

### 3.3 No other changes
There are no `.spec`, `_doc.js`, or AngularJS changes. The legacy files don't use this code.

## 4. Implementation plan
1. `aggrid/projects/nggrids/src/nggrid.ts`, `handleDragViewportScroll`:
   - Replace the `ag-body-viewport` lookup with `ag-grid-viewport`.
   - Set the horizontal target according to §3.1.
   - Add the guards from §3.2.
   - Guard the `scrollBy` calls inside the interval.
2. Add a Vitest test `aggrid/projects/nggrids/src/nggrid-drag-scroll.spec.ts` (or add to an existing grid spec) that exercises `handleDragViewportScroll` through a minimal host or a directive instance:
   - Markup without viewport elements: the call does not throw, `dragViewportRect` stays unset, and no interval is started.
   - AG Grid 36-like markup (`.ag-grid-viewport` and `.ag-body-horizontal-scroll-viewport`): the correct elements are cached, and a pointer near the bottom edge calls `scrollBy` with a positive `top` on the viewport. Use fake timers and mock `getBoundingClientRect`/`scrollBy` per element.
   - The drag-end cleanup clears the interval.
3. Run `npm run build`, `npm run lint`, and `npm run test` from `aggrid/`.

## 5. Acceptance criteria
- [ ] Dragging a record from one Data Grid or Power Grid to another no longer throws, and the drop is delivered (`onDragOver` and drop handlers run).
- [ ] Dragging near the top or bottom edge auto-scrolls the grid vertically.
- [ ] Dragging near the left or right edge of a horizontally scrollable grid auto-scrolls the columns.
- [ ] If the grid DOM lacks the expected elements, `handleDragViewportScroll` doesn't throw and doesn't cache a null rect.
- [ ] New Vitest tests pass. Build and lint are clean.

## 6. Out of scope
- Replacing the DOM-based scrolling with grid-API scrolling (triage approach 3).
- Changes to the legacy AngularJS `datasettable`/`groupingtable`.
- Other drag-and-drop behaviour changes.

## 7. Open questions
| Question | Owner | Status |
|----------|-------|--------|
| Does horizontal `scrollBy` on `.ag-grid-viewport` move the center columns in AG Grid 36, or is the proxy needed? Verify during implementation. | Developer | open |
| Should the viewport rect be refreshed per drag instead of cached for the whole drag (for example, if the grid resizes during a drag)? Assumed: keep the current caching per drag. | Developer | open |
