# Triage Report — SVYX-1141

**Verdict:** PROCEED

## Reported problem

In Pivot mode, the powergrid's `rowStyleClassFunc` callback does not provide enough
information to distinguish leaf-group rows from regular group rows. The callback
currently receives `(rowIndex, rowData, event, isGroup)` but AG Grid's `IRowNode`
exposes many more useful properties (e.g. `leafGroup`, `level`, `expanded`, `footer`,
`allChildrenCount`, `key`) that would allow styling decisions.

## Root-cause assessment

The `rowStyleClassFunc` callback is invoked at `powergrid.ts:533`:

```ts
return rowStyleClassFunc(params.rowIndex,
  (params.data || Object.assign(params.node.groupData, params.node.aggData)),
  null, params.node.group);
```

Only four arguments are passed: `rowIndex`, `rowData`, `event` (always null), and
`params.node.group` (boolean). The full AG Grid `RowClassParams` object (which
contains the complete `IRowNode` at `params.node`) is available but not forwarded.

The same limitation exists in the AngularJS implementation (`datasettable.js:454`):
```js
return rowStyleClassFunc(params.rowIndex, rowData, params.event, params.node.group);
```

This is a genuine feature gap — not a bug or misconfiguration. The reporter correctly
identifies that `IRowNode` contains `leafGroup` and other properties that would enable
their use case.

## Ticket premise check

The ticket proposes exposing "the whole node object or at least most of its properties"
as a parameter. This is a sound approach. The codebase already has precedent for
passing the full AG Grid `params` object as an extra argument to client functions —
see `createColumnCallbackFunctionFromString` at `powergrid.ts:2042`:

```ts
return (params: any) => func(params.node.rowIndex, params.data,
  params.colDef.colId !== undefined ? params.colDef.colId : params.colDef.field,
  params.value, params);
```

The 5th `params` argument gives full access to the AG Grid context. The same pattern
should be applied to `rowStyleClassFunc`.

## Approaches considered

1. **Add a 5th argument with selected node properties** — Create a plain object with
   curated properties (`leafGroup`, `level`, `expanded`, `footer`, `key`,
   `allChildrenCount`, `rowPinned`, `group`, `parent.key`) and pass it as argument 5.
   - Pros: Stable API surface, only exposes what we document, no risk of leaking
     internal AG Grid state.
   - Cons: Must be maintained as AG Grid evolves; users may still want properties we
     didn't include.

2. **Add a 5th argument with the full `params.node` (IRowNode)** — Pass the AG Grid
   row node object directly.
   - Pros: Full flexibility, zero maintenance cost, matches `createColumnCallbackFunctionFromString`
     pattern. Backward-compatible (existing callbacks ignore extra args).
   - Cons: Exposes AG Grid internals; if AG Grid changes `IRowNode` shape, user code
     could break. However, this risk already exists for column callbacks.

3. **Pass the full AG Grid `params` object as argument 5** — Same as approach 2 but
   with the entire `RowClassParams` (includes `node`, `api`, `context`, etc.).
   - Pros: Maximum flexibility, perfectly mirrors the column callback pattern already
     in use.
   - Cons: Same AG Grid coupling concern. Slightly more exposed surface.

4. **No code change** — Tell the user to use `rowClassRules` in AG Grid directly via
   `gridOptions`.
   - Pros: No code needed.
   - Cons: Powergrid doesn't expose raw `gridOptions` manipulation to Servoy
     developers. The `rowStyleClassFunc` is the sanctioned way to style rows. Not
     actionable for the reporter.

## Recommendation

**Approach 3: Pass the full AG Grid `params` object as a 5th argument.** This exactly
matches the established pattern for column-level callbacks (`cellStyleClassFunc`,
`cellRendererFunc`, etc.) and provides maximum flexibility with no maintenance burden.
It is fully backward-compatible — existing callbacks with 4 parameters will simply
ignore the extra argument.

Changes required:
- `powergrid.ts:533` — add `params` as 5th arg to `rowStyleClassFunc(...)` call
- `datasettable.js:454` — add `params` as 5th arg (AngularJS parity)
- `datasettable_doc.js` — update doc comment to mention the 5th parameter
- `datasettable.spec:30` — update doc tag to describe the new parameter

## Git history findings

- **`a2750b3` (SVY-16332, 2021-08-03):** Changed `rowStyleClassFunc` from
  `(rowIndex, data, event)` to `(rowIndex, data, event, isGroup)` and added
  `groupData + aggData` fallback for group rows. This was the last intentional
  evolution of this callback's signature.
- **`8159a1fe` (2026-07-31):** Strict-mode TypeScript refactoring — added `as any`
  casts but didn't change the callback signature.
- The 4th argument (`params.node.group`) was added specifically for SVY-16332 to help
  with group-row styling. SVYX-1141 is a natural continuation of that work.
