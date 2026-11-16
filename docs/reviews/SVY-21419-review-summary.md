# SVY-21419 review summary: requestSelectionPromises out of sync

**Risk: ELEVATED.** The 2025.3 backport restores a saved `selectionEvent` after programmatic selection changes without the SVY-21681 "consume" guard that 2026.3 and master carry, so a stale ctrl/shift click can plausibly be replayed after a server-side selection change in a multiSelect Data Grid. Confirmed by code reading, not reproduced at runtime.

**Reviewed scope:** `aggridcomponents`, branch `2025.3`, commit `d58188f` (SVY-21419 backport row selection corruption fix to 2025.3). One file, `aggrid/projects/nggrids/src/datagrid/datagrid.ts`, +26/-4. The change is patch-id identical to `9dc7986` (2026.3) and `e71a15c` (master, 2026.6).

## Manual test plan

Environment: a Servoy NGClient with the 2025.3 nightly (`_2025.3`) or a local build of `d58188f`, and a Data Grid bound to a foundset large enough to page or lazy-load.

**Verifying the fix**
1. Single-select Data Grid on a large foundset: scroll to trigger loading of new rows and click different rows quickly while rows load. Watch the browser console for `requestSelectionPromises` errors. Then set `foundset.selectedIndex = n` from a form method and confirm the grid follows.
2. Repeat in a `multiRow` grid with plain clicks, then ctrl-click and shift-click.
3. Confirm a click made during a data-load callback is not lost. The clicked row must be selected in the grid and in `foundset.getSelectedIndexes()`.

**Regression checks**
1. Stale replay: multiSelect grid, ctrl-click row 5, then set `foundset.selectedIndexes = [2]` from a form method. Compare the highlighted rows with `foundset.getSelectedIndexes()` and watch websocket traffic for an extra `requestSelectionUpdate` for row 5. Repeat with shift-click and after a keyboard selection.
2. Single-select: click a row, change the selection from the server, confirm the grid follows. Also double-click a row first, then change the selection from the server.
3. Server-driven `foundset.selectedIndex` change while no click is pending, and while a request is in flight.
4. Grouped grid: click a row, expand and collapse groups, confirm selection and `onCellClick` still work.
5. Reject path: make `requestSelectionUpdate` fail (for example an `onRecordSelection` handler that cancels) and confirm the grid reverts to the server selection.
6. Cell editing: click into an editable cell and confirm the edit still starts.

**Automated checks:** from `aggrid/` run `npm run build`, `npm run lint`, `npm run test_headless`. They were not run during the review because `node_modules` was missing.

**Surfaces:** Angular Data Grid, single-select and `multiRow`, with and without row grouping. The Power Grid has no references to the changed code.

## Possible improvements / follow-ups

- **Port the SVY-21681 guard to 2025.3.** Add `if (selectionEvent && this.selectionEvent === selectionEvent) this.selectionEvent = null;` at the start of `onSelectionChangedEx` (commit `452d276`). It needs a manual port: 2025.3 uses `this.agGrid.api` where 2026.x uses `this.agGrid().api`.
- **Branch coverage.** Not all branches are covered:
  - `2024.3` (LTS, maintained, Jira `2024.3.13 LTS`) still has the `shift()` code. `d58188f` applies cleanly there. Backport it together with the guard, and re-check the multiRow path by hand.
  - `2026.6` has the restore without the guard, so it carries the same stale-replay risk. Port `452d276` if a 2026.6.2 is planned.
  - `2024.12`, `2025.6`, `2025.9`, `2025.12` are affected but look dormant. No action unless a patch release is planned.
  - `2026.3` and `master` are fully covered.
- **Legacy AngularJS grid.** `aggrid/groupingtable/groupingtable.js` has the same `requestSelectionPromises.shift()` pattern on every branch, including the fixed ones. Decide whether a follow-up case is needed.
- **Fix Version.** The case lists only `2026.12`, but the keyed commit is on `2025.3`. Consider adding `2025.3.8 LTS` (and `2024.3.13 LTS` if backported). The originals `9dc7986` and `e71a15c` carry no issue key.
- **Log string.** `requestSelectionPromises out of sync` is no longer logged on 2025.3. Out-of-order resolution is now handled silently.
- **Docs drift.** `AGENTS.md` and `.opencode/skills/sdd/phases/project-context.md` say version 2025.3.6, while `aggrid/package.json` on `2025.3` is 2025.3.8.

**Open questions for the author**
1. Was the SVY-21681 guard deliberately left out of the 2025.3 backport?
2. Are the 2024.3 LTS line and the legacy `groupingtable.js` intentionally not covered?
3. Which Fix Version(s) should the case carry?
4. Is the `TypeError: Cannot read properties of null (reading 'getInternalState')` in the ticket expected to be resolved by this fix?
5. Has the customer confirmed the result with the `_2025.3` nightly build?
