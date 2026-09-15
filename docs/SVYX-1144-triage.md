# Triage Report — SVYX-1144

**Verdict:** PROCEED

## Reported problem
When a grid uses the `headerGroup` column feature (grouping several columns under a
shared header group), the user can drag individual columns *out* of the group,
splitting it apart. The reporter wants the group to stay intact: the whole group can
be reordered, but its member columns must not be draggable out of the group.

The reporter already identified AG Grid's `marryChildren=true` on the column group
definition as the mechanism, and notes they cannot configure it today because it must
be set at the group level (not the individual column level).

## Root-cause assessment
This is a genuine gap in the Servoy grid components, not a user misconfiguration or a
third-party bug.

Both Angular grids build column-group definitions on the fly from the flat `columns`
array whenever a column has a `headerGroup` string set:

- Power Grid: `aggrid/projects/nggrids/src/powergrid/powergrid.ts:1177-1188`
- Data Grid: `aggrid/projects/nggrids/src/datagrid/datagrid.ts:1972-1983`

The generated group def only ever receives `headerName`, `headerClass`, and
`children`. It never sets `marryChildren`, so AG Grid defaults it to `false` and
allows children to be dragged out of the group. The legacy AngularJS implementations
do the same (`datasettable/datasettable.js:1184-1191`,
`groupingtable/groupingtable.js:6077-6084`).

Crucially, the user has **no way** to set `marryChildren` from Servoy. The per-column
`columnDef` / `columnOptions` escape hatch
(`powergrid.ts:1147-1165`) is merged only into the individual child `colDef`, never
into the synthesized group def. The group def is created internally and keyed purely
by the `headerGroup` string, with no corresponding model property. So the reporter's
statement is accurate: there is currently no configuration surface for a
group-level property like `marryChildren`.

The spec `column` type exposes `headerGroup` and `headerGroupStyleClass` but nothing
that maps to a group-level `marryChildren`:
- `aggrid/datasettable/datasettable.spec:517-518`
- `aggrid/groupingtable/groupingtable.spec:721-722`

AG Grid Enterprise (v36, bundled) does support `marryChildren` on a column group def
(confirmed in `aggrid/lib/ag-grid-enterprise.js:8827` and the BOOLEAN_PROPERTIES
list at `:31274`), so the capability is available — it just isn't wired up.

## Ticket premise check
The premise holds. `marryChildren=true` on the group def is the correct AG Grid
mechanism, and the reporter is right that it can only be set at group level, which is
why they can't reach it through the existing per-column `columnDef` override. The
ticket does not over-prescribe an implementation; it correctly diagnoses the missing
configuration surface. The fix is to expose a way to set `marryChildren` on the
synthesized group definition.

## Approaches considered

1. **Add a boolean column property (e.g. `headerGroupKeepColumnsTogether` /
   `marryChildren`) and apply it to the group def when building groups.**
   When the first column of a `headerGroup` is encountered, copy that flag onto
   `colGroups[headerGroup]['marryChildren']`. Add it to both specs, both `_doc.js`
   files, both Angular grids, and both AngularJS grids for full sync.
   - Pros: matches existing pattern (group properties are derived from the member
     columns, like `headerGroupStyleClass`); simple; discoverable in the designer;
     one flag controls the behaviour; works for both grids.
   - Cons: the flag lives on a column but semantically applies to the whole group, so
     it's only meaningful on (and read from) the first column of the group — needs a
     clear doc note. Touches many files (4 layers × 2 grids) to stay in sync.

2. **Add a dedicated group-configuration mechanism (e.g. a `headerGroups` map /
   array of group options on the model).**
   - Pros: cleaner semantics — group-level properties described in one place; room to
     grow (future group-level options).
   - Cons: significantly larger design and API surface; introduces a new model
     concept where today groups are implicit (derived only from the `headerGroup`
     string); overkill for a single boolean; more risk and more to document.

3. **Extend the per-column `columnDef` override to also apply group-level keys to the
   group def.**
   - Pros: no new named property.
   - Cons: fragile and implicit — the user would have to know that a `marryChildren`
     key in `columnDef` gets hoisted to the group; mixes column-level and group-level
     concerns in one bag; hard to document and easy to get wrong. Not discoverable.

4. **No code change.**
   - Pros: zero effort/risk.
   - Cons: leaves a real, reasonable requirement unmet with no workaround. The user
     genuinely cannot configure this today (the group def is internal and has no
     model backing). Rejected.

## Recommendation
**PROCEED with Approach 1** — add a dedicated boolean column property that maps to
`marryChildren` on the synthesized column-group definition.

Rationale: it mirrors the existing design where group-level attributes
(`headerGroupStyleClass` → group `headerClass`) are already read from the member
column when the group is first created. It is minimal, discoverable in the Servoy
designer, and consistent across Power Grid and Data Grid. The value should be read
from the first column that establishes the group (same place `headerName`/
`headerClass` are set today), with a doc note that it is a group-level flag.

Implementation must keep all layers in sync per AGENTS.md:
- Spec: `datasettable/datasettable.spec` and `groupingtable/groupingtable.spec`
- Docs: `datasettable/datasettable_doc.js` and `groupingtable/groupingtable_doc.js`
- Angular: `powergrid.ts` (group build at ~1177) and `datagrid.ts` (~1972), plus the
  `PowerGridColumn` / column interface additions
- AngularJS: `datasettable.js` (~1184) and `groupingtable.js` (~6077)

Naming and exact default are minor decisions for the spec author (Approaches 2/3 were
considered and rejected as over- or under-engineered).

## Git history findings
The group-building block was last meaningfully changed in commit `4115c75`
("SVYX-780 Order of columns with headerGroup", 2024-02-28), which added
`colDefs.push(...)` and `headerName`, and removed a prior `headerGroupIndex`
concept. That change was about group *ordering*, unrelated to keeping children
together. Adding `marryChildren` does not revert or conflict with any intentional
decision recorded there.
