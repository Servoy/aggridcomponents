# Triage Report — SVY-21479

**Verdict:** PROCEED

## Reported problem
The Data Grid (AG Grid, foundset-based) throws a browser error when a foundset sort
is called from a form's `onShow` handler:

```js
function onShow(firstShow, event) {
    elements.table.myFoundset.foundset.sort('created_at desc')
}
```

Browser console error:

```
sablo.service.ts:99 TypeError: Cannot read properties of undefined (reading 'getSortColumns')
    at t.getSortModel (servoy-nggrids.mjs:5738:37)
    at t.changeListener (servoy-nggrids.mjs:7135:36)
    ...
    at Hee.fireChanges (viewport.service.ts:843:23)
    at t.fromServerToClient (foundset_converter.ts:258:45)
```

The stack shows a foundset viewport change firing the grid's `changeListener`, which
calls `getSortModel()`, which reads `this.foundset.getSortColumns()` where
`this.foundset` is `undefined`.

Reported by Laura Avram, priority Minor, fixVersion 2026.9.0, found during the
2026.09 upgrade/test cycle (linked to SCCC-3502).

## Root-cause assessment
The error is a real bug in the Data Grid Angular component, caused by an initialization
ordering / race condition introduced in this release cycle.

`getSortModel()` unconditionally dereferences `this.foundset`
(`aggrid/projects/nggrids/src/datagrid/datagrid.ts:2942`):

```ts
getSortModel() {
    const sortModel = [];
    let sortColumns: any = this.foundset.getSortColumns();   // this.foundset can be undefined
    ...
}
```

`this.foundset` is only assigned inside `initRootFoundset()`
(`datagrid.ts:1635`). That method now bails out early if the grid is not yet ready:

```ts
initRootFoundset() {
    if (!this.isGridReady) return;              // added in ee508d76
    this.foundset = new FoundsetManager(this, this.myFoundset(), 'root', true);
    ...
}
```

The foundset change listener, however, is registered independently of whether
`this.foundset` was actually assigned. In the `myFoundset` change handler
(`datagrid.ts:1266-1280`):

```ts
this.myFoundsetId = change.currentValue.foundsetId;
const isChangedToEmpty = ...;
if (myFoundset.viewPort.size > 0 || isChangedToEmpty) {
    this.isRootFoundsetLoaded = true;           // marks "loaded"...
    this.initRootFoundset();                    // ...but this returns early if !isGridReady
} else {
    this.isRootFoundsetLoaded = false;
}
...
this.removeChangeListenerFunction = myFoundset.addChangeListener((ch) => {
    this.changeListener(ch);                     // listener always registered
});
```

Then `changeListener` (`datagrid.ts:4487`) guards only on `isRootFoundsetLoaded`,
not on `this.foundset` being present (`datagrid.ts:4509-4515`):

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

The race: when `myFoundset.viewPort.size > 0` at the time the model is applied but
the AG Grid `viewChild` has not yet resolved (`isGridReady === false`),
`isRootFoundsetLoaded` is set to `true` while `initRootFoundset()` returns early and
never assigns `this.foundset`. A subsequent foundset change (e.g. the
`sortColumnsChanged` event produced by the `onShow` `foundset.sort(...)` call) reaches
`changeListener`, passes the `isRootFoundsetLoaded` guard, and calls `getSortModel()`,
which dereferences the still-`undefined` `this.foundset` and throws.

`onShow` firing before the grid's `viewChild` resolves is exactly the window this
race needs, which is why the symptom is reproducible from `onShow` specifically.

## Ticket premise check
The ticket reports the symptom and stack trace only — it proposes no solution. The
stack trace is accurate and points directly at the root cause (`getSortModel` →
`this.foundset` undefined), so there is no premise to reject. The fix belongs in the
Data Grid component code.

## Git history findings
- `getSortModel` / `getSortColumns` dereference: `datagrid.ts:2942` /
  `datagrid.ts:5216`, long-standing code.
- The `isRootFoundsetLoaded = true; initRootFoundset();` block dates to commit
  `61126f09` (lvostinar, 2025-05-19).
- The `viewPort.size > 0` condition around it: `bfade532` (cPecican, 2026-02-05).
- **Introducing commit for this regression:** `ee508d76` (Gabi Boros, 2026-08-17):
  *"fix: defer AG Grid API calls to onGridReady to prevent undefined api errors"*.
  This commit added the `if (!this.isGridReady) return;` guard at the top of
  `initRootFoundset()` (`datagrid.ts:1633`) and moved AG Grid API wiring into
  `onGridReady`. That guard is what allows `initRootFoundset()` to return without
  assigning `this.foundset` while callers still mark the foundset as "loaded".
  This commit targets fixVersion 2026.9.0 — the same version the ticket was filed
  against — confirming this is a regression introduced within the current release.

  The same commit did add a call to `initRootFoundset()` inside `onGridReady`
  (`datagrid.ts:549-551`), which recovers the assignment once the grid is ready.
  But nothing prevents a foundset `changeListener` (e.g. the `onShow` sort) from
  firing in the window before `onGridReady` runs, so the crash still occurs.

## Approaches considered

1. **Guard `getSortModel()` (and `getSortColumns()`) against an undefined foundset**
   — Return an empty sort model / `null` when `this.foundset` is not yet set.
   - Pros: Minimal, directly addresses the throwing line; mirrors the existing
     null-guard style already used elsewhere (`datagrid.ts:1196`, `4757`, and
     `getSortColumns` at `5216` which already null-checks `this.foundset`). Low risk.
   - Cons: Treats the symptom at the dereference site; the deeper ordering
     inconsistency (`isRootFoundsetLoaded === true` while `this.foundset === undefined`)
     remains and could surface elsewhere.

2. **Fix the ordering invariant in `changeListener` / init path** — Do not let
   `isRootFoundsetLoaded` be set to `true` unless `this.foundset` was actually
   assigned, and/or add a `this.foundset` presence check to the `changeListener`
   early-return guard so it re-runs `initRootFoundset()` (now that the grid may be
   ready) instead of proceeding into sort handling.
   - Pros: Fixes the root cause (the invariant that `isRootFoundsetLoaded` implies a
     valid `this.foundset`), preventing this and similar undefined-foundset errors.
   - Cons: Slightly larger change touching the load-state logic; needs care to not
     regress the browser-refresh and empty-foundset paths that also toggle
     `isRootFoundsetLoaded`.

3. **Combination (recommended): defensive guard in `getSortModel()` plus restoring the
   ordering invariant** — Add the cheap null-guard so no dereference can ever throw,
   and correct the init/`changeListener` logic so `isRootFoundsetLoaded` is not set
   ahead of `this.foundset`.
   - Pros: Immediate crash elimination plus a proper fix of the underlying race;
     robust against timing variations.
   - Cons: Marginally more code than a pure symptom patch.

4. **No code change** — Rely on users not calling foundset sort in `onShow`, or on
   AngularJS behaviour.
   - Pros: None.
   - Cons: `foundset.sort()` in `onShow` is a legitimate, common pattern; this is a
     regression introduced in 2026.9.0. Leaving it produces a hard browser error and
     breaks the sort. Not acceptable.

## Recommendation
**PROCEED** with **Approach 3**: add a defensive null-guard in `getSortModel()` (and
verify `getSortColumns()` on the DataGrid path) so the dereference can never throw,
**and** correct the initialization ordering so `isRootFoundsetLoaded` is only set to
`true` when `this.foundset` has actually been assigned (or have `changeListener`
lazily call `initRootFoundset()` when `this.foundset` is missing but the grid is now
ready). This eliminates the reported crash and removes the underlying
`isRootFoundsetLoaded`/`this.foundset` inconsistency introduced by commit `ee508d76`.

The pure symptom patch (Approach 1) is an acceptable fallback if a minimal, low-risk
change is required for the 2026.9.0 timeline, but Approach 3 is preferred because it
also closes the root-cause race.
