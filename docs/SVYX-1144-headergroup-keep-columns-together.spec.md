# Spec: SVYX-1144 — Keep header-group columns together (`marryChildren`)

## 1. Goal
Give Servoy developers a way to keep the columns of a header group locked together, so
an end user can reorder the whole group but cannot drag an individual column out of it.
This is done by exposing a new boolean column property, `headerGroupKeepColumnsTogether`,
that maps to AG Grid's `marryChildren=true` on the synthesized column-group definition.
It closes a real gap: today the group definition is created internally, is keyed only by
the `headerGroup` string, and has no model backing, so there is no way to reach
`marryChildren` from Servoy.

## 2. Background

### 2.1 How header groups are built today
Both Angular grids and both legacy AngularJS grids build column-group definitions on the
fly from the flat `columns` array whenever a column has a `headerGroup` string set. The
group def is created the first time a column that references a given `headerGroup` is
encountered, and group-level attributes are read from that first member column (e.g.
`headerGroupStyleClass` becomes the group's `headerClass`). Subsequent columns with the
same `headerGroup` are only pushed into the group's `children` array.

- Power Grid (Angular): `aggrid/projects/nggrids/src/powergrid/powergrid.ts:1177-1188`
  — builds the group def inline in a single loop; sets `headerName`, `headerClass`,
  `children`.
- Data Grid (Angular): `aggrid/projects/nggrids/src/datagrid/datagrid.ts:1972-1983`
  — same inline pattern; sets `headerName`, `headerClass`, `children`.
- datasettable (AngularJS): `aggrid/datasettable/datasettable.js:1184-1191` stores
  `headerClass`/`children` into a `colGroups` map, then a **second loop**
  (`:1198-1204`) materialises each group def (`headerName`, `headerClass`, `children`).
- groupingtable (AngularJS): `aggrid/groupingtable/groupingtable.js:6077-6085` +
  the second loop at `:6091-6097` — same two-loop pattern as datasettable.

The generated group def never sets `marryChildren`, so AG Grid defaults it to `false`
and lets children be dragged out of the group.

### 2.2 Why the existing escape hatches don't reach it
The per-column `columnDef` / `columnOptions` override
(`powergrid.ts:1147-1165`) is merged only into the individual child `colDef`, never into
the synthesized group def. The group def has no corresponding model property. So there is
currently no configuration surface for a group-level property like `marryChildren`.

### 2.3 Spec `column` type
The shared `column` custom type exposes `headerGroup` and `headerGroupStyleClass` but
nothing that maps to a group-level `marryChildren`:
- `aggrid/datasettable/datasettable.spec:517-518`
- `aggrid/groupingtable/groupingtable.spec:721-722`

### 2.4 AG Grid support
AG Grid Enterprise v36 (bundled) supports `marryChildren` on a column-group definition
(`aggrid/lib/ag-grid-enterprise.js:8827`, and the `BOOLEAN_PROPERTIES` list at `:31274`),
so the capability is available — it just isn't wired up.

### 2.5 Shared-spec architecture (per AGENTS.md)
`datasettable.spec` + `datasettable_doc.js` cover BOTH the AngularJS datasettable AND the
Angular Power Grid. `groupingtable.spec` + `groupingtable_doc.js` cover BOTH the AngularJS
groupingtable AND the Angular Data Grid. All layers must stay in sync.

## 3. Design

### 3.1 New column property
Add a boolean column property named exactly **`headerGroupKeepColumnsTogether`**
(default `false`) to the shared `column` type in both specs.

Semantics: it is a **group-level flag** even though it lives on a column. It is read from
the **first column that establishes the group** — the same place `headerName`/
`headerClass` are set today. Setting it to `true` on that first member column marks the
whole group as `marryChildren=true`. Its value on later member columns is ignored (the
group def already exists by then). This mirrors the existing `headerGroupStyleClass →
group headerClass` behaviour. The doc note must state this clearly.

Default `false` preserves current behaviour (children can be dragged out of the group).

### 3.2 Mapping to the group definition
When the group def is first created, copy the flag onto the group def as `marryChildren`:

- Angular (single-loop pattern), add alongside `headerName`/`headerClass`:
  ```typescript
  colGroups[column.headerGroup]['marryChildren'] = column.headerGroupKeepColumnsTogether;
  ```
- AngularJS (two-loop pattern): store it in the `colGroups` map at group-creation time,
  then apply it when materialising the group def in the second loop:
  ```javascript
  // first loop, when creating colGroups[column.headerGroup]:
  colGroups[column.headerGroup]['marryChildren'] = column.headerGroupKeepColumnsTogether;
  // second loop, when building the group object:
  group.marryChildren = colGroups[groupName]['marryChildren'];
  ```

Only assign `marryChildren` when the group def is first created (inside the
`if (!colGroups[column.headerGroup])` block), so the first-column-wins rule holds.

### 3.3 Angular column interfaces
Add the property to the TypeScript column interfaces so the Angular components compile and
the value is readable:
- `PowerGridColumn` — `aggrid/projects/nggrids/src/powergrid/powergrid.ts:2611` (near the
  `headerGroup` / `headerGroupStyleClass` fields at `:2612-2613`).
- Data Grid column interface — `aggrid/projects/nggrids/src/datagrid/datagrid.ts:6530-6531`
  (near `headerGroup` / `headerGroupStyleClass`).

Type: `boolean`.

### 3.4 Not `serveronly`
This property is read on the client (it drives the AG Grid column-group def), so per
AGENTS.md it must be a real model property with a corresponding field on the Angular
column interface. It is NOT tagged `serveronly`.

## 4. Implementation plan

1. **Spec — datasettable** (`aggrid/datasettable/datasettable.spec`): add
   `"headerGroupKeepColumnsTogether": {"type": "boolean", "default": false, "tags": {"doc": "..."}}`
   to the `column` type, next to `headerGroupStyleClass` (line ~518).
2. **Spec — groupingtable** (`aggrid/groupingtable/groupingtable.spec`): add the same
   property to the `column` type, next to `headerGroupStyleClass` (line ~722).
3. **Doc — datasettable** (`aggrid/datasettable/datasettable_doc.js`): add a
   `headerGroupKeepColumnsTogether: null` entry with a JSDoc comment after
   `headerGroupStyleClass` (line ~614), noting it is a group-level flag read from the
   first column of the group.
4. **Doc — groupingtable** (`aggrid/groupingtable/groupingtable_doc.js`): add the same
   documented entry after `headerGroupStyleClass` (line ~904).
5. **Angular — Power Grid** (`aggrid/projects/nggrids/src/powergrid/powergrid.ts`):
   - Add `marryChildren` assignment inside the group-creation block at `:1177-1184`.
   - Add `headerGroupKeepColumnsTogether: boolean;` to `PowerGridColumn` (~`:2613`).
6. **Angular — Data Grid** (`aggrid/projects/nggrids/src/datagrid/datagrid.ts`):
   - Add `marryChildren` assignment inside the group-creation block at `:1972-1979`.
   - Add `headerGroupKeepColumnsTogether: boolean;` to the column interface (~`:6531`).
7. **AngularJS — datasettable** (`aggrid/datasettable/datasettable.js`):
   - Store `marryChildren` in `colGroups` at `:1184-1190`.
   - Apply `group.marryChildren` in the group-build loop at `:1198-1204`.
8. **AngularJS — groupingtable** (`aggrid/groupingtable/groupingtable.js`):
   - Store `marryChildren` in `colGroups` at `:6077-6085`.
   - Apply `group.marryChildren` in the group-build loop at `:6091-6097`.
9. **Build & verify**: `npm run build`, `npm run lint`, `npm run test_headless` from
   `aggrid/`.

## 5. Acceptance criteria
- [ ] A new boolean column property `headerGroupKeepColumnsTogether` (default `false`)
      exists in both `datasettable.spec` and `groupingtable.spec` on the `column` type.
- [ ] Both `_doc.js` files document the property, noting it is a group-level flag read
      from the first column that establishes the header group.
- [ ] When `headerGroupKeepColumnsTogether` is `true` on the first column of a
      `headerGroup`, the synthesized group def has `marryChildren: true` in Power Grid,
      Data Grid, datasettable, and groupingtable.
- [ ] With `marryChildren: true`, an end user can reorder the whole group but cannot drag
      an individual member column out of the group.
- [ ] Default (`false` / unset) preserves current behaviour — children can still be
      dragged out of the group.
- [ ] `PowerGridColumn` and the Data Grid column interface include
      `headerGroupKeepColumnsTogether: boolean`.
- [ ] `npm run build` compiles without errors; `npm run lint` produces no new warnings;
      existing tests pass.

## 6. Out of scope
- A general group-configuration mechanism / `headerGroups` map (Approach 2 — rejected as
  over-engineered).
- Hoisting arbitrary group-level keys through the per-column `columnDef` override
  (Approach 3 — rejected as fragile/implicit).
- Any other AG Grid column-group options (`openByDefault`, `columnGroupShow`, etc.).
- Reading the flag from any column other than the first one that establishes the group.

## 7. Open questions
| Question | Owner | Status |
|----------|-------|--------|
| Should the flag also be honoured if set on a later member column (not just the first)? Current design: first-column-wins, matching `headerGroupStyleClass`. | Product | resolved — first-column-wins per approved approach |
| Exact wording of the designer doc note. | Spec author | resolved — "group-level flag, read from the first column of the header group" |
