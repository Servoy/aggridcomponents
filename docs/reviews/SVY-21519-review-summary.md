# Review Summary: SVY-21519 NG1 Grid column of type combobox doesn't fit the whole content

**Risk: MODERATE.** The fix changes when the dropdown opens (now after the async valuelist load). It could not be run in a browser during review, so the timing is unverified. Every finding confirmed in code is Low, and there is no security relevance.

**Scope:** `aggridcomponents`, one patch (patch-id `7a736464`) on four lines:
- `5e94539` on master
- `a2adccd` on 2026.3
- `ea1a07f` on 2025.3
- `80a62c3` on 2024.3

The only file changed is `aggrid/groupingtable/groupingtable.js` (`SelectEditor`).

**Fix Versions:** `2026.9.0`, `2026.3.2 LTS`, `2025.3.7 LTS`, `2024.3.12 LTS`. The release-target check is MATCH. Each Fix Version has its commit on its own line.

## Manual test plan

Use the NG1 client with a Data Grid. The reference solution is the cloud test solution `gestion_economica` linked in the case. A quick check on one maintenance line is enough, because the patch is identical on all four.

**Verifying the fix**
1. Open a Data Grid with a COMBOBOX column whose valuelist has an option clearly wider than the column.
2. Click the cell once. The dropdown should open at once, as wide as the longest option, with no clipping.
3. Repeat on another row and after a page reload, so you know it is not only a first-load effect.
4. Compare with the same solution in NG2. The look should be the same.

**Regression checks**
1. Press F2 or Enter on a combobox cell. The select takes focus and the dropdown opens (the SVY-20989 auto-open behaviour is kept).
2. Pick an option and press Enter. The value is stored. With `editNextCellOnEnter` set, focus moves to the next cell.
3. Use the arrow keys inside the opened select. They change the selection and do not move the grid cell.
4. Start editing a combobox cell, then click another cell or press Esc right away. There should be no console errors and no stray focus or popup.
5. Delay the valuelist response by more than 5 s and start editing. This is the known trade-off. Note whether the dropdown opens, whether focus lands, and what the user sees.
6. Make the valuelist lookup fail, if you can, and start editing. There should be no JavaScript error, and the cell should stay usable (Esc, click away).
7. Use a combobox column with an empty or unset valuelist. The picker should still open, as before.
8. Run steps 1-3 in Chrome and in one other supported browser. `showPicker()` support varies, and unsupported browsers fall into the existing `catch`.

**Not needing coverage:** Power Grid NG1 (`datasettable.js` has no combobox editor), the NG2 grids (`selecteditor.ts` is unchanged and was the model for the fix), and the `.spec` files.

**Automated checks:** none cover this. The legacy AngularJS files have no unit tests.

## Possible improvements and follow-ups

- **Release targeting (to confirm with the author):**
  - Fix Version `2026.9.0` vs. git tag `v2026.9.0`: the tag (2026-09-02) does not contain the fix. It first ships in `v2026.9.1` (2026-10-19). Jira has no 2026.9.1 version, so `2026.9.0` may just be the only one available.
  - The released non-LTS line `2026.6` (`v2026.6.0`) does not contain the fix and has no Fix Version. Was that intended?
  - Tag `v2025.3.6` was cut from master and carries the fix. The 2025.3 branch commit only first appears in `v2025.3.7`.
- **No failure path on the valuelist load.** Focus and auto-open now happen only in the `.then` success callback. If `vl.filterList("")` rejects or hangs, the select stays empty and unfocused. Before the patch it was at least focused. A rejection handler that still focuses the select would remove the difference. Whether `filterList` can reject is unknown, because it lives in the Servoy runtime.
- **Auto-open can be lost on a slow valuelist.** `showPicker()` needs recent user activation (about 5 s in Chromium). A slower load throws a `NotAllowedError`, which the existing `catch` swallows. The NG2 editor has the same trade-off.
- **Keys pressed during a slow load** (Enter, Tab, arrows) go to the grid and not the select, because focus now lands after the load.
- **The deferred `setTimeout` is not cancelled in `destroy()`.** If the user leaves the cell early, `focus()` and `showPicker()` run on a detached select. Nothing visibly fails, and the `catch` swallows any exception.
- **Not verified:** the order of AG Grid 21.2.2 `init` and `afterGuiAttached` relative to the promise callback, and the case screen recording and screenshots.
- **Documentation drift (minor):** `.opencode/sdd/project-context.md` says Cypress `.cy.ts` tests, but `AGENTS.md` says Vitest `.spec.ts`. `AGENTS.md` also says current version 2026.9.0, while the repo is at 2026.9.3.
