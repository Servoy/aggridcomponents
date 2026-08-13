# Triage Report — SVY-21291

**Verdict:** PROCEED

## Reported problem
The Data Grid (AG Grid component) throws a console error `sortHandlerPromises out of sync` when using the AG Grid version shipped with the 2026.06 release. The error appears when a user-defined `onSort` handler is configured on the grid.

## Root-cause assessment

The error originates from `datagrid.ts:3529-3536` — a consistency check in `onSortHandler()` that verifies the promise being resolved via `shift()` matches the one that was originally pushed. When promises are added out of order or duplicated, the check fails.

**Root cause:** The `onSortChanged` handler (line 666-678) calls `onSortHandler()` whenever `this.onSort()` is truthy, **regardless of the event source**:

```typescript
onSortChanged: (event: SortChangedEvent) => {
    if (event.source === 'uiColumnSorted' || event.source === 'columnMenu') {
        this.isSortModelApplied = true;
    }
    this.storeColumnsState();
    if (this.isTableGrouped()) { ... }
    if (this.onSort()) {
        this.onSortHandler();  // <-- fires even for programmatic/api-triggered sorts
    }
},
```

Multiple code paths trigger `applySortModel()` programmatically, which calls `api.applyColumnState()` → fires `onSortChanged` with `source === 'api'`:

1. **`initRootFoundset()`** (line 1628-1629): When `onSort` is defined, it calls `applySortModel(getSortModel())` to apply the foundset's current sort state to the grid. This triggers `onSortChanged` → `onSortHandler()` → pushes a promise to the queue → sends a sort request to the server — **before the grid even has its data loaded**.
2. **`changeListener()`** (line 4533): When a foundset definition change occurs, `applySortModel()` is called again.
3. **`restoreColumnsState()`** (line 3274): Restoring sort state also triggers the event.

Each programmatic `applySortModel()` call feeds back into `onSortHandler()`, creating **spurious** sort handler promises. If rapid successive sorts occur (e.g., grid initialization + foundset change + user click), multiple promises are pushed before earlier ones resolve, and `shift()` returns a different promise than expected — triggering the "out of sync" error.

The `isSortModelApplied` guard (line 667-669) was introduced in commit `119fbf4b` (SVY-20928) to restrict **foundset sort requests** to UI-initiated sorts only — but this guard does NOT prevent `onSortHandler()` from being called on non-UI events.

## Ticket premise check
The ticket reports the symptom but proposes no specific solution. The problem is confirmed to be in the Servoy component code (not in AG Grid itself or user code). The error is a real bug — the promise queue integrity check fails due to programmatic sort changes re-entering the `onSort` handler.

## Approaches considered

1. **Guard `onSortHandler()` with the event source check** — Only call `onSortHandler()` when `event.source === 'uiColumnSorted' || event.source === 'columnMenu'`. This is the most targeted fix.
   - Pros: Minimal change, directly addresses the feedback loop, matches the intent (onSort should only fire for user-initiated sorts). The AngularJS version implicitly avoided this because older AG Grid versions did not fire `onSortChanged` for programmatic `setSortModel()`.
   - Cons: Must verify that no user workflow relies on `onSort` being called for programmatic sort changes (unlikely — the handler's purpose per the spec doc is "Called when sort has changed" in the UI sense).

2. **Add a boolean flag to suppress re-entry** — Set a flag like `isApplyingSortModel = true` before calling `applyColumnState()`, skip `onSortHandler()` when the flag is set.
   - Pros: Works even if AG Grid changes event source strings in future versions.
   - Cons: More complex, flag management across async boundaries is error-prone, similar pattern already exists with `isSortModelApplied`.

3. **Clear `sortHandlerPromises` before pushing new ones during programmatic sorts** — Reset the queue when a new programmatic sort overwrites the previous one.
   - Pros: Prevents the "out of sync" error symptom.
   - Cons: Masks the real issue (spurious server calls from re-entrant `onSort`), wastes server round-trips, could cause data inconsistency.

4. **No code change** — Treat it as cosmetic (it's a `log.error`, not a thrown exception).
   - Pros: No risk of regression.
   - Cons: The error indicates real promise queue corruption; when `sortHandlerPromises.length > 0`, the change listener at line 4505 skips foundset updates — so stale promises can block data refresh indefinitely.

## Recommendation

**Approach 1 — Guard `onSortHandler()` with the event source check.**

The fix is to move the `onSortHandler()` call inside the existing source check:

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

This ensures `onSortHandler()` (and the `onSort` callback to the server) only fires for genuine user-initiated sort interactions. The same fix should be applied to `groupingtable.js` for the AngularJS implementation.

## Git history findings

- **Commit `61126f09`** (lvostinar, 2025-05-19, SVY-20216): Introduced the current `onSortChanged` structure in the Angular datagrid.
- **Commit `119fbf4b`** (Gabi Boros, 2026-03-12, SVY-20928): Added `event.source === 'columnMenu'` to the `isSortModelApplied` guard — but left `onSortHandler()` outside the guard.
- **Commit `f8299d1`** (Gabi Boros, 2026-05-12, SVY-21065): Added `applySortModel()` call in `initRootFoundset()` when `onSort` is defined — this is the direct trigger that makes the feedback loop fire during grid initialization.
- **Commit `bfade532`** (cPecican, 2026-02-05, SVY-20819): Refactored to signals; changed `this.onSort` (input decorator) to `this.onSort()` (signal input read). This means `if (this.onSort())` now correctly checks "is the handler defined" (truthy function ref), but didn't change the logic flow.

The combination of `f8299d1` (calling `applySortModel` during init) and the unguarded `onSortHandler()` call creates the feedback loop that was not present before May 2026.
