# Triage Report — SVY-21409

**Verdict:** PROCEED

## Reported problem
In Servoy 2026.03, the Power Grid (`aggrid-datasettable` / Angular `powergrid`) crashes
when a group is opened before the component has initialized its expanded-state object.
The observed error is:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'J:982')
    at e.addRowExpandedState
    at e.onRowGroupOpenedHandler
```

## Root-cause assessment
The bug is real and lives in Servoy component code, specifically the Angular Power Grid:

- `aggrid/projects/nggrids/src/powergrid/powergrid.ts:1791` `addRowExpandedState()`:

  ```ts
  const _internalExpandedState = this.__internalExpandedState();
  if (!_internalExpandedState) {
      this.__internalExpandedState.set(new Object());   // signal updated
  }
  let node = _internalExpandedState;                    // still the OLD undefined value
  for (const key of groupKeys) {
      if (!node[key]) { ... }                            // TypeError: node is undefined
      node = node[key];
  }
  ```

  When `__internalExpandedState()` returns a falsy value (first group opened before the
  state object exists), the code creates a fresh object *in the signal* but keeps the
  local `node` pointing at the original `undefined`. The subsequent `node[key]` access
  throws exactly the reported `Cannot read properties of undefined` error. Reproduced
  the exact throw in isolation (`node = undefined; node[key]` → same message).

- Caller: `onRowGroupOpenedHandler()` at `powergrid.ts:1714`/`:1725` invokes
  `addRowExpandedState(groupKeys)` on the expand path, so any first-group expand before
  init triggers it.

Git history confirms the regression source and its date:

- `powergrid.ts:1793-1795,1798,1808` were introduced by commit **bfade532**
  ("SVY-20819 use signals instead of @input in our components", cPecican, 2026-02-05).
  The pre-signal code read/assigned a plain `this.model._internalExpandedState` object,
  so `node` and the assigned object were always the same reference. The signal migration
  split "read" (`this.__internalExpandedState()`) from "write"
  (`this.__internalExpandedState.set(...)`) but forgot to re-point `node` at the newly
  created object — introducing the bug.

**The Data Grid is NOT affected.** In `datagrid.ts:4270` the same method was written
differently: after the falsy check it does
`const _internalExpandedStateUpdated = Object.assign({}, _internalExpandedState)` and
walks `_internalExpandedStateUpdated`. `Object.assign({}, undefined)` returns `{}`
(verified), so `node` is always a valid object there. Likewise the legacy AngularJS
`datasettable.js:1759` assigns the new object to `node` correctly. Only the Angular
Power Grid regressed.

## Ticket premise check
The ticket's premise holds up completely. It correctly:
- identifies the file/method (`addRowExpandedState`),
- names the exact introducing commit (bfade532) and cause (signal migration),
- diagnoses the stale-local-variable bug,
- proposes a minimal, correct fix.

The proposed fix is sound: assign the newly created object to the local variable before
the loop so `node` starts from it. This matches the pre-regression behaviour and the
pattern already used by the Data Grid.

## Approaches considered

1. **Apply the ticket's fix (assign new object to local before the loop).** — Recommended.
   - Pros: Minimal, targeted, restores pre-bfade532 behaviour, matches the working
     Data Grid pattern, no API/spec change.
   - Cons: None significant.

2. **Mirror the Data Grid implementation exactly** (`Object.assign({}, state)` + emit the
   copy). 
   - Pros: Makes the two grids consistent; Data Grid already emits an immutable copy which
     plays nicer with signal/`OnPush` change detection.
   - Cons: Slightly larger change than needed for the crash; changes emit semantics
     (emits a copy vs the live object). Worth considering for consistency but not required
     to fix the crash.

3. **No code change.**
   - Pros: none.
   - Cons: The crash is a genuine, reproducible regression in Servoy component code with a
     clear stack trace and identified commit. Doing nothing leaves the Power Grid broken
     when the first group is opened. Rejected.

## Recommendation
**PROCEED** with approach 1 (the ticket's proposed fix) in
`aggrid/projects/nggrids/src/powergrid/powergrid.ts` `addRowExpandedState()`: initialize
the local variable to the freshly created object before iterating `groupKeys`, e.g.

```ts
let internalExpandedState = this.__internalExpandedState();
if (!internalExpandedState) {
    internalExpandedState = {};
    this.__internalExpandedState.set(internalExpandedState);
}
let node = internalExpandedState;
```

Consider aligning with the Data Grid's immutable-copy pattern (approach 2) if signal
change-detection consistency across the two grids is desired, but the crash fix does not
require it. No `.spec`/`_doc.js` change is needed — this is a pure internal-logic fix.

## Git history findings
- Regression commit: **bfade532** — "SVY-20819 use signals instead of @input in our
  components" (cPecican, 2026-02-05). Introduced the split read/write on
  `__internalExpandedState` in `powergrid.ts` without re-pointing the local `node`.
- The Data Grid (`datagrid.ts:4270`, base line 61126f09) and the legacy AngularJS
  `datasettable.js:1759` do not have the bug.
