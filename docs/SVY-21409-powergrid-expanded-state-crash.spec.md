# Spec: SVY-21409 — Power Grid crashes when first group is expanded before expanded-state init

## 1. Goal
Fix a regression in the Angular Power Grid (`powergrid`) where expanding a group row before
the internal expanded-state object has been created throws an uncaught
`TypeError: Cannot read properties of undefined`, breaking group expansion. The fix restores
the pre-regression behaviour by pointing the local traversal variable at the freshly created
state object, so `addRowExpandedState()` never dereferences `undefined`.

## 2. Background

### 2.1 Where the crash happens
When a user expands a group row, AG Grid fires the row-group-opened event, which the Power
Grid handles in `onRowGroupOpenedHandler()` (`aggrid/projects/nggrids/src/powergrid/powergrid.ts:1714`).
On the expand path it calls `addRowExpandedState(groupKeys)` (`powergrid.ts:1725`), which
persists the expanded group into an internal state object used to restore expansion state.

`addRowExpandedState()` (`powergrid.ts:1791`) currently reads the state signal into a local,
creates a new object *in the signal* when the state is falsy, but then walks the **old** local
value:

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

When `__internalExpandedState()` returns a falsy value (the first group is opened before the
state object exists), the code creates a fresh object in the signal but keeps `node` pointing
at the original `undefined`. The subsequent `node[key]` access throws the reported error:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'J:982')
    at e.addRowExpandedState
    at e.onRowGroupOpenedHandler
```

### 2.2 Regression source
The split read/write on `__internalExpandedState` was introduced by commit **bfade532**
("SVY-20819 use signals instead of @input in our components", 2026-02-05). The pre-signal code
read and assigned a plain `this.model._internalExpandedState` object, so `node` and the created
object were always the same reference. The signal migration separated the read
(`this.__internalExpandedState()`) from the write (`this.__internalExpandedState.set(...)`) but
did not re-point `node` at the newly created object — introducing the bug.

### 2.3 Why the Data Grid is not affected
The Data Grid's `addRowExpandedState()` (`aggrid/projects/nggrids/src/datagrid/datagrid.ts:4270`)
was written differently: after the falsy check it does
`const _internalExpandedStateUpdated = Object.assign({}, _internalExpandedState)` and walks
`_internalExpandedStateUpdated`. `Object.assign({}, undefined)` returns `{}`, so `node` is
always a valid object there. The legacy AngularJS `datasettable.js` also assigns the new object
to `node` correctly. Only the Angular Power Grid regressed.

## 3. Design

### 3.1 Fix approach (approved: Approach 1)
Initialize the local traversal variable to the freshly created object *before* iterating
`groupKeys`, so `node` starts from the newly created object instead of the stale `undefined`.
This restores pre-bfade532 behaviour and matches the working Data Grid pattern with a minimal,
targeted change. No change to emit semantics beyond emitting the object that is actually
traversed.

Proposed change to `addRowExpandedState()` in `powergrid.ts`:

```ts
addRowExpandedState(groupKeys: any) {

    let _internalExpandedState = this.__internalExpandedState();
    if (!_internalExpandedState) {
        _internalExpandedState = new Object();
        this.__internalExpandedState.set(_internalExpandedState);
    }

    let node = _internalExpandedState;

    // Persist the state of an expanded row
    for (const key of groupKeys) {
        if (!node[key]) {
            node[key] = new Object();
        }

        node = node[key];
    }
    this._internalExpandedStateChange.emit(_internalExpandedState);
}
```

Key points:
- `_internalExpandedState` becomes a `let` and is reassigned to the newly created object inside
  the falsy branch, then set into the signal.
- `node` starts from `_internalExpandedState`, which is now guaranteed to be a valid object.
- The emitted value (`_internalExpandedState`) is the same object being traversed, preserving
  the existing behaviour of emitting the live state object.

### 3.2 Scope boundary
This is a pure internal-logic fix inside one method. It does not touch the Servoy `.spec`
contract, `_doc.js`, the AngularJS `datasettable.js`, or any public API. The Data Grid is not
modified. Aligning the Power Grid with the Data Grid's immutable-copy pattern
(`Object.assign({}, state)` + emitting a copy) was considered in triage as Approach 2 but is
out of scope here — the crash fix does not require changing emit semantics.

## 4. Implementation plan

1. In `aggrid/projects/nggrids/src/powergrid/powergrid.ts`, modify `addRowExpandedState()`
   (around `powergrid.ts:1791`):
   - Change `const _internalExpandedState = this.__internalExpandedState();` to a `let`.
   - Inside the `if (!_internalExpandedState)` branch, assign the newly created object to
     `_internalExpandedState` before (or as part of) calling `this.__internalExpandedState.set(...)`.
   - Leave the rest of the method (`node` initialization, loop, `emit`) unchanged so `node`
     now starts from the guaranteed-valid object.
2. Verify no other caller relies on the previous (buggy) behaviour — `removeRowExpandedState()`
   and other consumers of `__internalExpandedState` are unaffected.
3. Build and lint: `npm run build` and `npm run lint` from `aggrid/`.
4. Run tests: `npm run test_headless` from `aggrid/`.

## 5. Acceptance criteria
- [ ] Expanding the first group in the Power Grid **before** any expanded state exists no longer
      throws `TypeError: Cannot read properties of undefined`.
- [ ] The expanded group is correctly persisted into `__internalExpandedState` on first expand
      (the created object contains the expected group-key nesting).
- [ ] Subsequent expands/collapses continue to update the expanded state correctly (no regression
      in `removeRowExpandedState()` behaviour).
- [ ] `_internalExpandedStateChange` still emits the current expanded-state object after an expand.
- [ ] `npm run build` compiles without errors.
- [ ] `npm run lint` reports no new warnings for the changed method.
- [ ] `npm run test_headless` passes.

## 6. Out of scope
- Refactoring the Power Grid to mirror the Data Grid's immutable-copy pattern
  (`Object.assign({}, state)` and emitting a copy) — considered but not required for the crash fix.
- Any change to the Servoy `.spec` contract, `_doc.js`, or the AngularJS `datasettable.js`.
- Changes to the Data Grid (`datagrid.ts`), which is not affected.
- Broader review or cleanup of the SVY-20819 signal migration beyond this method.

## 7. Open questions
| Question | Owner | Status |
|----------|-------|--------|
| Should the Power Grid be aligned with the Data Grid's immutable-copy emit pattern for signal/OnPush consistency (separate follow-up)? | Team | open |
