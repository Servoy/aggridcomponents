# Spec: SVYX-1141 — Pass full params to rowStyleClassFunc

## 1. Goal

Add the full AG Grid `RowClassParams` object as a 5th argument to the `rowStyleClassFunc`
callback in the Power Grid (and its AngularJS counterpart, datasettable). This gives
Servoy developers access to the complete `IRowNode` (including `leafGroup`, `level`,
`expanded`, `footer`, `allChildrenCount`, `key`, etc.) so they can make fine-grained
row styling decisions — especially in pivot and grouped modes — without needing a new
Servoy API for every AG Grid property.

## 2. Background

### 2.1 Current callback signature

The `rowStyleClassFunc` callback is currently invoked with four arguments:

```
rowStyleClassFunc(rowIndex, rowData, event, isGroup)
```

- `rowIndex` — `params.rowIndex`
- `rowData` — `params.data`, or merged `groupData + aggData` for group rows
- `event` — always `null` (Angular) / `params.event` (AngularJS)
- `isGroup` — `params.node.group` (boolean)

This was last extended in commit `a2750b3` (SVY-16332, 2021-08-03) which added the
4th `isGroup` argument to support group-row styling.

### 2.2 Established pattern for column callbacks

The codebase already passes the full AG Grid `params` object as the final argument to
column-level callbacks. See `createColumnCallbackFunctionFromString` at
`powergrid.ts:2041`:

```ts
return (params: any) => func(params.node.rowIndex, params.data,
  params.colDef.colId !== undefined ? params.colDef.colId : params.colDef.field,
  params.value, params);
```

The 5th `params` argument gives full access to the AG Grid context. This spec applies
the same pattern to `rowStyleClassFunc`.

### 2.3 Backward compatibility

JavaScript/TypeScript functions silently ignore extra positional arguments. Existing
callbacks with 4 parameters will continue to work unchanged.

## 3. Design

### 3.1 Angular implementation (powergrid.ts)

At `powergrid.ts:533`, change the `rowStyleClassFunc` invocation to pass `params` as a
5th argument:

```ts
return rowStyleClassFunc(
  params.rowIndex,
  (params.data || Object.assign(params.node.groupData as any, params.node.aggData)),
  null,
  params.node.group,
  params
) as any;
```

The `params` object is AG Grid's `RowClassParams`, which contains:
- `params.node` — the full `IRowNode` (with `leafGroup`, `level`, `expanded`, etc.)
- `params.api` — the Grid API
- `params.context` — the grid context
- `params.data` — row data (same as arg 2 for non-group rows)

### 3.2 AngularJS implementation (datasettable.js)

At `datasettable.js:454`, apply the same change:

```js
return rowStyleClassFunc(params.rowIndex, rowData, params.event, params.node.group, params);
```

### 3.3 Spec file documentation update

Update the `"doc"` tag in `datasettable.spec` to describe the new 5th parameter and
its purpose.

### 3.4 Doc file update

Update the JSDoc comment in `datasettable_doc.js` to document the callback's full
signature including the new `params` argument.

## 4. Implementation plan

1. **`aggrid/projects/nggrids/src/powergrid/powergrid.ts:533`** — Add `params` as the
   5th argument to the `rowStyleClassFunc(...)` call inside `agGridOptions.getRowClass`.

2. **`aggrid/datasettable/datasettable.js:454`** — Add `params` as the 5th argument to
   the `rowStyleClassFunc(...)` call inside `gridOptions.getRowClass`.

3. **`aggrid/datasettable/datasettable.spec:30`** — Update the `"doc"` tag for
   `rowStyleClassFunc` to describe all 5 parameters:
   `"Function to add style class to row. Parameters: rowIndex, rowData, event, isGroup, params (AG Grid RowClassParams — includes node, api, context)"`

4. **`aggrid/datasettable/datasettable_doc.js:22–24`** — Update the JSDoc block:
   ```js
   /**
    * Function to add style class to row.
    *
    * @param {number} rowIndex - The row index
    * @param {object} rowData - The row data (for group rows: merged groupData + aggData)
    * @param {object} event - The event object (may be null)
    * @param {boolean} isGroup - Whether this is a group row
    * @param {object} params - The full AG Grid RowClassParams (includes node, api, context)
    * @return {string} CSS class name(s) to apply
    */
   var rowStyleClassFunc;
   ```

## 5. Acceptance criteria

- [ ] Existing callbacks with 4 parameters continue to work unchanged (backward compat)
- [ ] A callback with 5 parameters receives the full AG Grid `RowClassParams` as the 5th arg
- [ ] `params.node.leafGroup` is accessible and correctly reflects the node's leaf-group status
- [ ] `params.node.level` correctly reports the grouping depth
- [ ] The change applies to both Angular (powergrid) and AngularJS (datasettable) implementations
- [ ] The `.spec` file doc tag documents the new parameter
- [ ] The `_doc.js` file documents the full callback signature
- [ ] Build succeeds without errors (`npm run build`)
- [ ] Lint passes (`npm run lint`)

## 6. Out of scope

- Adding `rowStyleClassFunc` to the Data Grid (groupingtable/datagrid) — it does not
  currently support this property
- Changing the type of `rowStyleClassFunc` from `clientfunction` to something more
  specific in the spec
- Exposing additional row-level callbacks (e.g., `rowStyleFunc` for inline styles)
- Changes to `groupingtable.spec` or `groupingtable_doc.js`

## 7. Open questions

| Question | Owner | Status |
|----------|-------|--------|
| None     | —     | —      |
