# Spec: SVY-21291 — onSort handler feedback loop causes promise queue corruption

## 1. Goal

Prevent the `onSortHandler()` method from firing on programmatic (API-triggered) sort changes. Currently, any call to `applySortModel()` / `applyColumnState()` fires `onSortChanged` with `source === 'api'`, which re-enters `onSortHandler()`, corrupts the `sortHandlerPromises` queue, and logs `sortHandlerPromises out of sync`. This also blocks foundset data refresh because the change listener skips updates while promises are pending.

## 2. Background

### 2.1 onSort handler contract

The `onSort` handler (defined in `groupingtable.spec` line 354) is documented as "Called when sort has changed" and is intended to notify user code of **user-initiated** sort interactions. It receives column indexes and sort directions, sends a request to the server, and returns a promise that is tracked in a FIFO queue (`sortHandlerPromises`).

### 2.2 Promise queue integrity

`onSortHandler()` (datagrid.ts:3511) pushes a promise and expects `shift()` to return the same promise on resolution. When multiple programmatic sorts fire in rapid succession (grid init, foundset change, state restore), promises are pushed out of order, and `shift()` returns the wrong one — triggering the error.

### 2.3 The feedback loop

Multiple code paths call `applySortModel()` programmatically:
1. `initRootFoundset()` (line 1628–1629) — applies foundset sort state on grid init
2. `changeListener()` (line 4533) — responds to foundset definition changes
3. `restoreColumnsState()` (line 3274) — restores saved column state

Each of these triggers `onSortChanged` with `event.source === 'api'`, which then calls `onSortHandler()` if `this.onSort()` is truthy — creating spurious server round-trips and queue corruption.

### 2.4 Existing partial guard

Commit `119fbf4b` (SVY-20928) added a guard that only sets `isSortModelApplied = true` for UI sources (`uiColumnSorted` or `columnMenu`). However, the `onSortHandler()` call was left **outside** this guard, so it still fires for all sources.

### 2.5 Git history

- `61126f09` (SVY-20216): Introduced current `onSortChanged` structure in Angular datagrid
- `119fbf4b` (SVY-20928): Added `columnMenu` to `isSortModelApplied` guard but left `onSortHandler()` unguarded
- `f8299d1` (SVY-21065): Added `applySortModel()` in `initRootFoundset()` when `onSort` is defined — direct trigger for the feedback loop during initialization

## 3. Design

### 3.1 Move onSortHandler() inside the source check (Angular datagrid)

In `datagrid.ts` (line 666–678), move the `onSortHandler()` call inside the existing `event.source` guard:

```typescript
onSortChanged: (event: SortChangedEvent) => {
    if (event.source === 'uiColumnSorted' || event.source === 'columnMenu') {
        this.isSortModelApplied = true;
        if (this.onSort()) {
            this.onSortHandler();
        }
    }
    this.storeColumnsState();
    if (this.isTableGrouped()) {
        this.removeAllFoundsetRef = true;
        this.refreshAgGridServerSide();
    }
},
```

This ensures `onSortHandler()` only fires for genuine user-initiated sorts. The `storeColumnsState()` and grouped-table refresh remain unconditional (they must respond to all sort changes to keep column state accurate).

### 3.2 Add source check to AngularJS groupingtable

In `groupingtable.js` (line 734–743), the `onSortChanged` callback does not receive the event parameter. Update it to accept the event and apply the same guard:

```javascript
onSortChanged: function(event) {
    storeColumnsState();
    if (isTableGrouped()) {
        removeAllFoundsetRef = true;
        gridOptions.api.purgeServerSideCache();
    }
    if (event && (event.source === 'uiColumnSorted' || event.source === 'columnMenu')) {
        if ($scope.handlers.onSort) {
            onSortHandler();
        }
    }
},
```

The defensive `event &&` check ensures backward compatibility in case older AG Grid versions do not pass the event object.

## 4. Implementation plan

1. **`aggrid/projects/nggrids/src/datagrid/datagrid.ts`** (line 666–678):
   - Move `if (this.onSort()) { this.onSortHandler(); }` inside the `event.source === 'uiColumnSorted' || event.source === 'columnMenu'` block
   - Keep `storeColumnsState()` and `isTableGrouped()` logic outside the guard

2. **`aggrid/groupingtable/groupingtable.js`** (line 734–743):
   - Add event parameter to the `onSortChanged` function signature
   - Wrap the `onSortHandler()` call with the same source check (with defensive null check on `event`)
   - Keep `storeColumnsState()` and `isTableGrouped()` logic outside the guard

3. **Verify build**: `npm run build` from `aggrid/`

4. **Verify lint**: `npm run lint` from `aggrid/`

5. **Run tests**: `npm run test_headless` from `aggrid/`

## 5. Acceptance criteria

- [ ] `onSortHandler()` is NOT called when `event.source === 'api'` (programmatic sort changes)
- [ ] `onSortHandler()` IS called when `event.source === 'uiColumnSorted'` (column header click)
- [ ] `onSortHandler()` IS called when `event.source === 'columnMenu'` (sort via column menu)
- [ ] `storeColumnsState()` still fires for all sort changes (preserves column state persistence)
- [ ] Grouped table refresh (`refreshAgGridServerSide` / `purgeServerSideCache`) still fires for all sort changes
- [ ] No `sortHandlerPromises out of sync` error on grid initialization when `onSort` handler is defined
- [ ] No `sortHandlerPromises out of sync` error when foundset definition changes while `onSort` is defined
- [ ] The fix applies to both Angular (datagrid.ts) and AngularJS (groupingtable.js) implementations
- [ ] Build succeeds without errors
- [ ] Lint passes without new warnings

## 6. Out of scope

- Refactoring the `sortHandlerPromises` queue mechanism itself
- Changing how `applySortModel()` works in `initRootFoundset()` or `changeListener()`
- Adding the source check to the Power Grid / datasettable (it does not have an `onSortHandler` — its `onSortChanged` only calls `storeColumnsState()`)
- Making the AngularJS implementation use `isSortModelApplied` (it doesn't have this flag and doesn't need it for this fix)

## 7. Open questions

| Question | Owner | Status |
|----------|-------|--------|
| Are there any user workflows that intentionally rely on `onSort` firing for programmatic sort changes? | Product | Assumed no — the spec doc says "Called when sort has changed" in UI sense, and programmatic re-entry was not originally intended |
