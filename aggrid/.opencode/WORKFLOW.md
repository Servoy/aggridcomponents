# Grid Workflow

## Commands

| Command | Purpose |
|---------|---------|
| `/grid-plan <component>: <description>` | Analyse a bug/feature, archive previous plan, write new plan |
| `/grid-revise <feedback>` | Iterate on the plan (repeatable) |
| `/grid-implement` | Execute the plan, or fix review issues if review.md has NEEDS CHANGES |
| `/grid-review` | Review implementation against the plan, write verdict |
| `/grid-test` | Run Cypress component tests for the changed component |
| `/grid-restore [filename]` | Restore an archived plan (lists archives if no argument) |

## Standard Workflow

```
/grid-plan <component>: <description>
  ↓
/grid-revise <feedback>          (optional, repeatable)
  ↓
/grid-implement
  ↓
/grid-review
  ↓
  ├─ APPROVED → /grid-test → done
  └─ NEEDS CHANGES → /grid-implement → /grid-review → ... until APPROVED
                                          ↓
                                      /grid-test    (if tests fail → /grid-implement → /grid-test)
```

## Session Strategy (Token Efficiency)

| Session | Commands | Why |
|---------|----------|-----|
| Session 1 | `/grid-plan` + `/grid-revise` | Keep plan iteration together — feedback is conversational |
| Session 2 | `/grid-implement` | Reads plan.md from disk, no prior context needed |
| Session 3 | `/grid-review` | Reads plan.md + git diff from disk |
| Session 4 | `/grid-test` | Runs Cypress tests — self-contained, reads plan.md for component |
| Session 5+ | `/grid-implement` + `/grid-review` + `/grid-test` | Fix loop — each cycle is self-contained |

Every command reads from `plan.md` or `review.md` on disk. Only `/grid-revise` benefits from staying in the same session as `/grid-plan` because your feedback builds on the conversation.

## Archiving

`/grid-plan` automatically archives the previous `plan.md` and `review.md` (if they exist) to `.opencode/plans/archive/<date>-<slug>.md` before writing a new plan. No manual cleanup needed.

Use `/grid-restore` to bring back an archived plan for re-implementation or reference.

## Setup

### AG Grid License Key (required for `/grid-test`)

Cypress component tests require an ag-grid enterprise license key. Create `cypress.env.json` in the project root (this file is gitignored):

```json
{
  "AG_GRID_LICENSE": "your-actual-license-key"
}
```

Alternatively, pass it via CLI:

```bash
npm run cy:run -- --env AG_GRID_LICENSE="your-actual-license-key"
```

### Context7 MCP Server

The `context7` MCP server in `opencode.json` requires an API key. Set the environment variable before running opencode:

```bash
export CONTEXT7_API_KEY="ctx7sk-your-key-here"
```

The config references it via `{env:CONTEXT7_API_KEY}`.
