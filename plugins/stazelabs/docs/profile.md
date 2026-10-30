# The project profile

Every project that uses these skills carries one file, committed:

    .claude/agent-workflow/profile.json

`/stazelabs:setup` writes it and edits it. The skills read it and never write it. A skill that finds the file missing, its `version` behind what the skill expects, or a key it needs absent, stops with "this project isn't set up for /stazelabs:<skill> yet: run /stazelabs:setup" and does nothing else. Project facts live here or in the project's own instruction files (CLAUDE.md and the documents `project.authority` lists), never inside a skill.

State the skills keep between runs goes beside it in `.claude/agent-workflow/state/<skill>.json`: today `hygiene.json`, `continuity.json`, `qa.json` and `update-docs.json`, written by the audit skills. A missing state file means a first run, never that setup is needed. The audit skills also read a per-project audit pack at `.claude/agent-workflow/audits/<skill>.md`; its headings are in [audit-packs.md](audit-packs.md).

## Keys

`version` (integer, required by every skill). The profile schema version. This document describes version 1. A skill that needs a key added in a later version says so and points at `/stazelabs:setup`, which migrates the file.

### `project`

| Key | Type | Required by | Meaning |
|---|---|---|---|
| `name` | string | all | The project's name, used in messages. |
| `authority` | string[] | plan, ticket | Paths (relative to the project root) of the documents that settle product and design decisions: the instruction file, a specs folder. A plan or change that contradicts them is a hard stop. |

### `tracker`

| Key | Type | Required by | Meaning |
|---|---|---|---|
| `kind` | string | plan, ticket, setup, hygiene, continuity, qa | The adapter file to use: `plugins/stazelabs/trackers/<kind>.md`. v1 ships `linear`. |
| `team` | string | plan, ticket, hygiene, continuity, qa | The team (or project) whose tickets these skills work. The adapter says how it is identified. |
| `prefix` | string | plan, ticket, qa | The ticket key prefix, `EMAIL` in `EMAIL-12`. Also seeds `repo.branchPattern`. |
| `states.started` | string | ticket | The state name a ticket takes when work begins. |
| `states.done` | string | ticket | The state name a ticket takes when its PR is merged. |
| `modelLabels` | object | plan, ticket, hygiene, continuity, qa | Maps the four tiers (`fable`, `haiku`, `sonnet`, `opus`) to the label names in the tracker. Usually identical. `fable` means spec work, not code; the other three are implementation tiers. |

### `repo`

| Key | Type | Required by | Meaning |
|---|---|---|---|
| `mainBranch` | string | ticket, preview-deploy, all audit skills | Usually `main`. |
| `branchPattern` | string | ticket | Branch name template. Placeholders: `{prefix_lower}`, `{number}`, `{slug}`. Default `{prefix_lower}-{number}-{slug}`. |
| `commitFormat` | string | ticket | Commit subject template. Placeholders: `{Area}`, `{summary}`, `{id}`. Default `{Area}: {summary} ({id})`. |
| `mergeStyle` | `merge`, `squash` or `rebase` | ticket, all audit skills | How `gh pr merge` merges. Stazelabs projects use `merge`. |
| `deleteBranchOnMerge` | boolean | ticket (read by the audit skills when they merge) | Pass `--delete-branch`. |
| `neverTriggerCI` | boolean | ticket, preview-deploy (read by the audit skills) | When true, the skills never dispatch a workflow and never add push or pull_request triggers; the local gate is the gate. |

### `gate`

| Key | Type | Required by | Meaning |
|---|---|---|---|
| `command` | string | plan, ticket, update-docs | The one shell command that must pass before a merge. |
| `notes` | string[] | ticket | Known gate quirks and their fixes, one per line, quoted to the implementer. Optional. |
| `smoke.command` | string | ticket | A second, slower check run only when the diff touches `smoke.paths`. Optional; omit the whole `smoke` object when there is none. |
| `smoke.paths` | string[] | ticket | Path prefixes that make the smoke run mandatory. |

### `review`

| Key | Type | Required by | Meaning |
|---|---|---|---|
| `model` | string | ticket | The model for the final review subagent (`opus` today). |
| `skipUnderLines` | integer | ticket | Diffs smaller than this that touch none of `alwaysReviewPaths` ship on the gate alone. |
| `alwaysReviewPaths` | string[] | ticket | Path prefixes or globs (`*.sql`) that are always reviewed regardless of size. |

### `hardStops`

string[], required by ticket and the audit skills. Actions that wait for the owner's yes in chat, in the owner's words ("any Fly, DNS or Resend action"). Two are always in force even if the list is empty: anything destructive (deleting data or branches the skill didn't make, force-push, rewriting history) and changing a recorded product decision in a `project.authority` document.

### `deploy`

Required only by `/stazelabs-go:preview-deploy`. Omit the object when the project has no tag-triggered deploy.

| Key | Type | Meaning |
|---|---|---|
| `provider` | string | `fly` is the only value v1 knows. |
| `app` | string | The provider's app name. |
| `url` | string | The deployed site's base URL. |
| `healthz` | string | Path that returns `ok` when the deploy is healthy. |
| `tagPrefix` | string | Tags that trigger the deploy workflow, `preview-`. |
| `workflow` | string | The GitHub Actions workflow file the tag fires. |
| `ciWorkflow` | string | A manual-dispatch CI workflow to consult, never trigger. Optional. |
| `runbooks` | string[] | Project documents the skill points people to for recovery steps. |
| `preDeployCheck` | string | A command the owner is asked to have run before a deploy. Optional. |

### `state`

| Key | Type | Meaning |
|---|---|---|
| `committed` | boolean | Whether `.claude/agent-workflow/state/` is committed. When false, setup adds it to `.gitignore`. |

## Example

See `../templates/profile.example.json` (`plugins/stazelabs/templates/profile.example.json` in the repo), which is healthcheck.email's profile.
