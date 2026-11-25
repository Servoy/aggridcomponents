# Review Summary — SVYX-1146: NG Grid icons in header disappear

**Risk: MODERATE.** The fix re-applies the header icon class synchronously inside the `displayedColumnsChanged` handler. Its timing against real AG Grid header rendering is only covered by jsdom/mocked tests.

**Scope reviewed:** aggridcomponents, master `37e30bb` (fix) + `caff726` (tests); cherry-picked to 2026.3 (`f26cf48`, `3886c08`), 2025.3 (`81e9373`) and 2024.3 (`ef742c1`).

## Manual test plan

**Verifying the fix**
1. Open a form with a Data Grid where one column has `headerIconStyleClass`. Check that the icon shows.
2. Hide that column and show it again. The icon must reappear without a refresh.
3. Repeat step 2 on a Power Grid.
4. Scroll the icon column out of view horizontally and back. The icon must still be there.
5. Repeat steps 1-4 on 2025.3 and 2024.3 builds (older AG Grid).

**Regression checks**
1. Toggle a different column's visibility 5 times. Check the icon label's `class` attribute for repeated tokens.
2. Grid without `headerIconStyleClass`: column virtualisation must still work.
3. Data Grid with `headerCheckbox` plus an icon column: the checkbox must still work after hide/show.
4. Two grids on one form with the same column id, icon on only one: the icon must stay on the right grid.
5. Time a grid with 50+ columns and one icon column, with and without the icon column.

Automated checks (from `aggrid/`): `npm run test_headless`, `npm run lint`, `npm run build`. These were not run during the review.

## Possible improvements / follow-ups
- `setupHeaderIconStyleClass` appends the class on every call with no presence check (`datagrid.ts:1141`, `powergrid.ts:699`). It now runs on every `displayedColumnsChanged`. Consider `classList.add` or a "not already present" check.
- One icon column now disables column virtualisation for the whole grid, and Power Grid is newly affected. A header class or component that survives rebuilds would avoid the performance cost on wide grids.
- The `[col-id=...]` lookup is document-wide, so two grids with the same column id can cross-apply the class. Power Grid also lacks the Data Grid's `getColumnID()` fallback for a missing id.
- Open question for the author: does the icon come back immediately after hide/show in a real running grid, or only on the next event?

## Release-target check: INDETERMINATE
- 2025.3.8: branch `2025.3` is at 2025.3.8 and carries `81e9373`. Tag `v2025.3.7` already contains the fix.
- 2026.3.3 LTS: tag `v2026.3.3` contains `f26cf48`, and the branch is already at 2026.3.4. Jira still shows the version as not released.
- 2024.3.13 LTS: tag `v2024.3.13` contains `ef742c1`, and the branch is already at 2024.3.14. Jira still shows the version as not released.
- 2026.12: no branch reports that version. `master` is at 2026.9.3, and tag `v2026.9.2` contains the fix.
- Open question: should the Fix Versions or their release flags be updated?
