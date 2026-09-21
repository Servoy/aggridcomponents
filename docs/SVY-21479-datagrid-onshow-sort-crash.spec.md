# Spec: SVY-21479 — Data Grid throws "Cannot read properties of undefined (reading 'getSortColumns')" when foundset.sort() is called from a form's onShow

## 1. Goal

Eliminate the browser error thrown by the Angular Data Grid when a foundset sort is
invoked from a form's `onShow` handler, e.g.:

```js
function onShow(firstShow, event) {
    elements.table.myFoundset.foundset.sort('created_at desc')
}
```

which currently produces:

```
TypeError: Cannot read properties of undefined (reading 'getSortColumns')
    at t.getSortModel (servoy-nggrids.mjs:5738:37)
    at t.changeListener (servoy-nggrids.mjs:7135:36)
    ...
    at Hee.fireChanges (viewport.service.ts:843:23)
    at t.fromServerToClient (foundset_converter.ts:258:45)
```

The fix must not only stop the crash but also ensure the requested `onShow` sort is
**actually applied** once the grid is ready (rows visibly ordered), and must not
reintroduce the "undefined api" regression that commit `ee508d76` fixed.

## 2. Background

Reported by Laura Avram (priority Minor, fixVersion 2026.9.0), found during the
2026.09 upgrade/test cycle and linked to SCCC-3502. The ticket reports the symptom and
stack trace only; it proposes no solution. Full root-cause analysis is in
`docs/SVY-21479-triage.md`. This spec implements the approved **Approach 3**
(combination fix).

### 2.1 Root cause — an initialization ordering race

`getSortModel()` (`aggrid/projects/nggrids/src/datagrid/datagrid.ts:2942`)
unconditionally dereferences `this.foundset`:

```ts
getSortModel() {
    const sortModel = [];
    let sortColumns: any = this.foundset.getSortColumns();   // this.foundset can be undefined
    ...
}
```

Here `this.foundset` is the root `FoundsetManager` instance. It is only assigned inside
`initRootFoundset()` (`datagrid.ts:1635`), which since commit `ee508d76` bails out early
when the grid is not ready:

```ts
initRootFoundset() {
    if (!this.isGridReady) return;              // added in ee508d76
    this.foundset = new FoundsetManager(this, this.myFoundset(), 'root', true);
    ...
}
```

The `myFoundset` model-change handler (`datagrid.ts:1266-1280`) sets
`isRootFoundsetLoaded = true` and calls `initRootFoundset()` whenever the incoming
foundset already has viewport rows — but `initRootFoundset()` returns early (leaving
`this.foundset` undefined) if the AG Grid `viewChild` has not resolved yet:

```ts
if (myFoundset.viewPort.size > 0 || isChangedToEmpty) {
    this.isRootFoundsetLoaded = true;           // marks "loaded"...
    this.initRootFoundset();                    // ...but returns early if !isGridReady
} else {
    this.isRootFoundsetLoaded = false;
}
...
this.removeChangeListenerFunction = myFoundset.addChangeListener((ch) => {
    this.changeListener(ch);                     // listener is always registered
});
```

`changeListener` (`datagrid.ts:4487`) guards only on `isRootFoundsetLoaded`, not on
`this.foundset` being present (`datagrid.ts:4509-4515`, `4525-4528`):

```ts
if (!this.isRootFoundsetLoaded) {
    if (changeEvent.viewportRowsCompletelyChanged || changeEvent.fullValueChanged) {
        this.isRootFoundsetLoaded = true;
        this.initRootFoundset();
    }
    return;
}
...
if (!this.onSort() && changeEvent.sortColumnsChanged) {
    if (this.sortPromise && (JSON.stringify(this.getAgGridSortModel()) === JSON.stringify(this.getSortModel()))) {
        ...                                       // getSortModel() -> this.foundset.getSortColumns() -> crash
```

**The race:** when `myFoundset.viewPort.size > 0` at model-apply time but the grid's
`viewChild` (`this.agGrid()`) has not yet resolved (`isGridReady === false`),
`isRootFoundsetLoaded` becomes `true` while `initRootFoundset()` returns early and never
assigns `this.foundset`. A subsequent `sortColumnsChanged` change (produced by the
`onShow` `foundset.sort(...)` call) reaches `changeListener`, passes the
`isRootFoundsetLoaded` guard, and calls `getSortModel()`, dereferencing the still-
`undefined` `this.foundset`. `onShow` firing before the grid's `viewChild` resolves is
exactly the window this race needs, which is why the symptom is reproducible from
`onShow` specifically.

Note: `FoundsetManager.getSortColumns()` (`datagrid.ts:5215`) already null-checks its
own inner `this.foundset`. The crash is one level up — dereferencing the
`FoundsetManager` (`this.foundset` on the DataGrid) itself, which is undefined.

### 2.2 The regression origin and the constraint it imposes (commit ee508d76)

Commit `ee508d76` (Gabi Boros, 2026-08-17), *"fix: defer AG Grid API calls to
onGridReady to prevent undefined api errors"*, targets the same fixVersion (2026.9.0)
and introduced this regression. That commit fixed a different race: the signal-based
`viewChild` (`this.agGrid()`) resolves **after** `ServoyBaseComponent` triggers
`svyOnInit` / `svyOnChanges`, so any `this.agGrid()!.api` call during init threw
"undefined api". Its fix was to:

1. Move all `this.agGrid()!.api` calls out of `svyOnInit` into `onGridReady` callbacks.
2. Guard `initRootFoundset()` with `if (!this.isGridReady) return;` (`datagrid.ts:1633`).
3. Re-run `initRootFoundset()` from `onGridReady` (`datagrid.ts:549-551`) to recover the
   assignment once the grid is ready.

The SVY-21479 fix **must not undo any of these**: it must not move AG Grid API calls
back before `onGridReady`, and it must not remove the `isGridReady` guard in
`initRootFoundset()`. The two fixes must coexist. What `ee508d76` did not cover is a
foundset `changeListener` (the `onShow` sort) firing in the window before `onGridReady`
runs — this spec closes that gap.

## 3. Design

The fix is the approved **Approach 3**: a cheap defensive guard so the dereference can
never throw, plus a correction of the initialization ordering invariant so that
`isRootFoundsetLoaded === true` implies `this.foundset` is assigned. Both parts are
required — the guard prevents the crash under any timing variation, and the invariant
fix ensures correctness (the `onShow` sort is still applied).

### 3.1 Defensive null-guard in `getSortModel()`

Guard `getSortModel()` (`datagrid.ts:2940-2974`) so that when `this.foundset` is
undefined it returns an empty sort model instead of throwing:

```ts
getSortModel() {
    const sortModel = [];
    if (!this.foundset) {
        return sortModel;
    }
    let sortColumns: any = this.foundset.getSortColumns();
    ...
}
```

This mirrors the existing null-guard style already used elsewhere in the file
(`datagrid.ts:1262`, `3009`, `getSortColumns` at `5215`). It is minimal and low-risk,
and by itself removes the throwing line. But it is explicitly **not sufficient** on its
own — returning an empty sort model where the caller expected a real one could silently
drop the sort. Hence 3.2.

### 3.2 Correct the initialization ordering invariant

Ensure `isRootFoundsetLoaded` is never `true` while `this.foundset` is undefined, and
ensure the pending `onShow` sort is applied once the grid becomes ready. Approach:

- In the `myFoundset` change handler (`datagrid.ts:1268-1275`), only mark
  `isRootFoundsetLoaded = true` when `this.foundset` was actually assigned. Because
  `initRootFoundset()` returns early when `!isGridReady`, set the flag based on the
  outcome, e.g.:

  ```ts
  if (myFoundset.viewPort.size > 0 || isChangedToEmpty) {
      this.initRootFoundset();
      this.isRootFoundsetLoaded = !!this.foundset;   // true only if actually initialized
  } else {
      this.isRootFoundsetLoaded = false;
  }
  ```

  (Order matters: call `initRootFoundset()` first, then derive the flag from whether
  `this.foundset` was set. Do not remove the `isGridReady` guard inside
  `initRootFoundset()`.)

- Additionally, harden the `changeListener` early-return path (`datagrid.ts:4509-4515`)
  so that when `this.foundset` is missing but the grid is now ready, it lazily runs
  `initRootFoundset()` rather than proceeding into sort handling with an undefined
  foundset:

  ```ts
  if (!this.isRootFoundsetLoaded || !this.foundset) {
      if (this.isGridReady && (changeEvent.viewportRowsCompletelyChanged || changeEvent.fullValueChanged || changeEvent.sortColumnsChanged)) {
          this.initRootFoundset();
          this.isRootFoundsetLoaded = !!this.foundset;
      }
      return;
  }
  ```

  This guarantees the invariant `isRootFoundsetLoaded === true` ⇒ `this.foundset`
  defined, and lets a `sortColumnsChanged` event that arrives before the grid is ready
  fall through harmlessly (returning early) instead of crashing.

### 3.3 The onShow sort must still be applied (correctness, not just crash suppression)

Because the grid may not be ready when the `onShow` `foundset.sort(...)` fires, the sort
must be applied later, when the grid renders. The existing `else` branch at
`datagrid.ts:5434` (comment: *"set the grid sorting if foundset sort changed from the
grid initialization (like doing foundset sort on form's onShow)"*) is the code path that
handles exactly this scenario — it calls `this.dataGrid.applySortModel(...)` and
`refreshAgGridServerSide()` when `isSortModelApplied` is false. The fix must ensure this
path still runs after the invariant correction:

- `initRootFoundset()` runs on `onGridReady` (`datagrid.ts:549-551`) and, when
  `this.onSort()` is falsy… note it currently only applies the sort model when
  `this.onSort()` is truthy (`datagrid.ts:1636-1638`). Verify that for the no-`onSort`
  case the datasource `getRows` flow reaches the `else` branch at `datagrid.ts:5434`
  and applies the foundset's sort columns to the grid once rows are requested.
- The net requirement: after the grid renders, the foundset's `created_at desc` sort set
  in `onShow` must be reflected in the grid's column state and row order. This is a
  distinct, explicitly testable outcome — separate from "no console error".

### 3.4 Git history

Carried from the triage report:

- `getSortModel` / `getSortColumns` dereference: `datagrid.ts:2942` / `datagrid.ts:5215`,
  long-standing code.
- `isRootFoundsetLoaded = true; initRootFoundset();` block: commit `61126f09`
  (lvostinar, 2025-05-19).
- `viewPort.size > 0` condition around it: commit `bfade532` (cPecican, 2026-02-05).
- **Regression-introducing commit:** `ee508d76` (Gabi Boros, 2026-08-17) — added the
  `if (!this.isGridReady) return;` guard at the top of `initRootFoundset()` and moved AG
  Grid API wiring into `onGridReady`. This is what allows `initRootFoundset()` to return
  without assigning `this.foundset` while callers still mark the foundset "loaded".
  Targets the same fixVersion (2026.9.0), confirming an in-release regression. The fix
  in this spec must coexist with `ee508d76` (see 2.2), not undo it.

## 4. Implementation plan

All changes in `aggrid/projects/nggrids/src/datagrid/datagrid.ts`.

1. **`getSortModel()` (line ~2940):** add an early `if (!this.foundset) return sortModel;`
   guard before `this.foundset.getSortColumns()` is called.
2. **`myFoundset` change handler (lines ~1268-1275):** reorder so `initRootFoundset()`
   is called first, then set `isRootFoundsetLoaded = !!this.foundset` so the "loaded"
   flag can never be `true` while `this.foundset` is undefined. Keep the empty-foundset
   `else` branch (`isRootFoundsetLoaded = false`) intact. Do NOT touch the `isGridReady`
   guard inside `initRootFoundset()`.
3. **`changeListener()` early-return guard (lines ~4509-4515):** extend the guard to also
   trigger when `this.foundset` is missing; when the grid is ready and a relevant change
   (`viewportRowsCompletelyChanged`, `fullValueChanged`, or `sortColumnsChanged`) arrives,
   lazily run `initRootFoundset()` and re-derive `isRootFoundsetLoaded`, then return —
   never fall through into sort handling with an undefined `this.foundset`.
4. **Verify the onShow-sort application path:** confirm that the `else` branch at
   `datagrid.ts:~5434` still executes for the no-`onSort` case so the foundset sort set
   in `onShow` is applied to the grid after render. Adjust only if the invariant change
   in step 2/3 alters when this branch is reached.
5. **Do NOT** move any `this.agGrid()!.api` call out of an `onGridReady` callback into
   `svyOnInit`/`svyOnChanges`, and **do NOT** remove the `if (!this.isGridReady) return;`
   guard in `initRootFoundset()` (preserve `ee508d76`).
6. **Tests** (`aggrid/projects/nggrids/src/datagrid/datagrid.spec.ts`): add regression
   tests covering the crash, the applied-sort outcome, and the ee508d76 coexistence
   scenario (see acceptance criteria).
7. Run `npm run build`, `npm run lint`, and `npm run test_headless` from `aggrid/`.

## 5. Acceptance criteria

- [ ] Calling `foundset.sort('created_at desc')` from a form's `onShow` handler no longer
      produces `TypeError: Cannot read properties of undefined (reading 'getSortColumns')`
      (or any undefined-foundset error) in the browser console.
- [ ] After the grid renders, the sort requested from `onShow` is actually applied: rows
      are ordered by `created_at desc` and the grid column state reflects the sort. This
      is verified independently of the "no console error" criterion.
- [ ] `getSortModel()` returns an empty sort model (does not throw) when `this.foundset`
      is undefined.
- [ ] The invariant holds: `isRootFoundsetLoaded === true` implies `this.foundset` is
      defined, in the `myFoundset` change handler and in `changeListener`.
- [ ] The `ee508d76` scenario still passes: when the AG Grid `viewChild` resolves after
      `svyOnChanges`/`svyOnInit`, no "undefined api" error is produced, and
      `initRootFoundset()` retains its `if (!this.isGridReady) return;` guard (no AG Grid
      API calls were moved back before `onGridReady`).
- [ ] Existing paths not regressed: browser-refresh (viewport already populated),
      newly-set/empty foundset, and grouped-view foundset-change (`purge`) behaviour are
      unchanged.
- [ ] `npm run build`, `npm run lint`, and `npm run test_headless` all pass from `aggrid/`.

## 6. Out of scope

- Changes to the AngularJS `groupingtable` implementation (`groupingtable/*.js`).
- Changes to the Power Grid / `datasettable` component.
- Refactoring the broader foundset initialization/loading state machine beyond what is
  needed to restore the `isRootFoundsetLoaded` ⇒ `this.foundset` invariant.
- The Servoy `.spec` / `_doc.js` contract files — no model property, handler, or API
  change is introduced by this fix.
- Reworking the signal `viewChild` resolution timing (that is the concern of `ee508d76`,
  which must be preserved, not re-opened).

## 7. Open questions

| # | Question | Assumption made |
|---|----------|-----------------|
| 1 | For the no-`onSort` case, does `initRootFoundset()` on `onGridReady` need to explicitly call `applySortModel(getSortModel())`, or does the datasource `getRows` → `else` branch at line ~5434 reliably apply the foundset sort? | Assume the existing `else` branch at ~5434 applies it; step 4 verifies and only adds an explicit `applySortModel` call if the branch is not reached. |
| 2 | Should `sortColumnsChanged` alone (without `viewportRowsCompletelyChanged`/`fullValueChanged`) trigger lazy `initRootFoundset()` in the `changeListener` early-return, or only be allowed to return harmlessly? | Assume triggering lazy init on `sortColumnsChanged` when the grid is ready is safe and helps apply the onShow sort promptly; if it causes double-init, restrict to returning harmlessly and rely on `onGridReady`'s init. |
| 3 | Jira REST was unreachable from the build environment (HTTP 000); ticket details were taken from the triage report. Any additional attachments/comments on SVY-21479 not captured in triage? | Assume the triage report captured all relevant ticket content (summary, stack trace, reporter, priority, fixVersion, SCCC-3502 link). |
