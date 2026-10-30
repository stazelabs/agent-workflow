---
name: setup
description: Set up (or revise) a project's agent-workflow profile at .claude/agent-workflow/profile.json: detect the ticketing MCP, gh and the superpowers plugin, ask for the team, labels, gate, branch and merge style, review rules, hard stops and optional deploy target, then write the file. Use when the user runs /stazelabs:setup, when another /stazelabs skill says the project isn't set up, or when the user asks to configure, initialize or change the workflow settings for a project.
argument-hint: (none)   re-run to review or change the profile
---

# /stazelabs:setup: write or revise the project profile

The profile is the one place a project's specifics live: which tracker and team, what the gate is, how branches and merges look, what needs the owner's yes, where deploys go. The skills read it and refuse to run without it. This skill is the only thing that writes it. The schema is `${CLAUDE_PLUGIN_ROOT}/docs/profile.md`, and a filled example is `${CLAUDE_PLUGIN_ROOT}/templates/profile.example.json`; read both first.

Ask one section at a time, suggest defaults from what you detect, and show the finished file before writing it. Never guess a value silently.

## 1. Detect

Run these and keep the results for the questions that follow:

- **Tracker MCP.** `ToolSearch` with the keyword query `linear get_issue list_teams whoami`. If Linear tools come back, call its `whoami` and note the workspace. If nothing comes back, the project can still be set up, but say plainly that `/stazelabs:plan` and `/stazelabs:ticket` won't run until a tracker MCP is connected (Linear under `/mcp` or the client's connectors), and continue.
- **GitHub CLI.** `gh auth status`. Not authenticated means `/stazelabs:ticket` can't open or merge PRs; say so and continue.
- **superpowers.** Its skills (`superpowers:test-driven-development`, `superpowers:requesting-code-review`) appear in this session's skill list. Missing means `/stazelabs:ticket` will refuse to run; say so and name the install command: `/plugin install superpowers@claude-plugins-official`.
- **The repo.** `git rev-parse --show-toplevel`, the current default branch (`git symbolic-ref refs/remotes/origin/HEAD` or `main`), `gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed,deleteBranchOnMerge` when `gh` works, a `Makefile` (list its targets with `make help` if that target exists, else grep `^[a-z-]+:`), `go.mod`, `package.json`, `.github/workflows/*.yml` (names and their `on:` triggers), and the instruction file (`CLAUDE.md`, `AGENTS.md`) plus any `docs/superpowers/specs` folder.
- **Existing profile.** If `.claude/agent-workflow/profile.json` exists, read it: this is a re-run. Show it section by section and ask which sections to change; skip the questions for the rest. If its `version` is older than 1, migrate by adding the new keys with questions for each.

## 2. Ask, section by section

Use `AskUserQuestion` where a short menu fits (teams, merge style, yes/no), plain questions otherwise. Offer the detected value as the recommended option.

1. **project**: `name` (default: the repo name); `authority` (default: the instruction file found, plus the specs folder if present).
2. **tracker**: `kind` (v1 offers `linear` only; if no tracker was detected, still record `linear` and say the skills will find it once connected); `team`, picked from `list_teams` (show name and key); `prefix` = the team's key; `states.started` and `states.done` (defaults `In Progress` and `Done`; confirm against `list_issue_statuses` for the team when available); `modelLabels` (default the four names `fable`, `haiku`, `sonnet`, `opus`). Check with `list_issue_labels` whether those labels exist on the team. If not, offer to create a `Model` label group (`save_issue_label` with `isGroup: true`, `groupType: "singleSelect"`, the team's UUID) and the four labels under it, each with a one-line description. Create only after a yes; this is the only tracker write this skill makes.
3. **repo**: `mainBranch` (detected); `branchPattern` (default `{prefix_lower}-{number}-{slug}`); `commitFormat` (default `{Area}: {summary} ({id})`; offer to read the last 20 commit subjects and match them); `mergeStyle` (default from `gh repo view`, Stazelabs projects use `merge`); `deleteBranchOnMerge` (detected); `neverTriggerCI` (default true; explain: the skills then never dispatch a workflow and the local gate is the gate).
4. **gate**: `command` (suggest a chain from the Makefile targets found, e.g. `make gen && make fmt && make vet && make lint && make test`, else `go test ./...` or `npm test`; the owner edits the line); `notes` (optional: known quirks and their fixes, one per line); `smoke` (optional: a slower check and the path prefixes that make it mandatory; skip the object when there is none).
5. **review**: `model` (default `opus`); `skipUnderLines` (default 50); `alwaysReviewPaths` (suggest the folders that hold handlers, database, auth, network and `*.sql`; the owner edits).
6. **hardStops**: the actions that wait for the owner's yes, in their words. Remind them that destructive actions and changes to authority documents are always hard stops and needn't be listed.
7. **deploy**: ask "Does this project deploy through a tag-triggered GitHub Action (the `/stazelabs-go:preview-deploy` flow)?" If yes: `provider` (`fly`), `app`, `url`, `healthz` (default `/healthz`), `tagPrefix` (suggest from any workflow whose trigger is `push: tags`), `workflow` (that file), `ciWorkflow` (a manual-dispatch workflow, if any), `runbooks` (suggest `ops/*.md` files found), `preDeployCheck` (optional). If no, omit the object.
8. **state**: `committed` (default true; when false, add `.claude/agent-workflow/state/` to `.gitignore`).

## 3. Write

- Assemble the JSON with `"version": 1`, keys in the order above, two-space indent. Show the whole file in a fenced block and ask for a yes.
- Write `.claude/agent-workflow/profile.json`, create `.claude/agent-workflow/state/` with a `.gitkeep`, and apply the `.gitignore` line if `state.committed` is false.
- Don't commit; tell the owner the files are ready to commit, and that teammates get the profile with the repo.

## 4. Report

List: what was detected and what is missing (tracker, `gh`, superpowers), the profile path, the sections written, any labels created, and the commands now available (`/stazelabs:plan`, `/stazelabs:ticket`, and `/stazelabs-go:preview-deploy` if `deploy` was set and that plugin is installed).

## Guardrails

- The only tracker write is label creation, after an explicit yes. Never create or edit tickets.
- Never run the gate, deploy, push, or change the repo beyond the profile, the state folder and the `.gitignore` line.
- A re-run never silently rewrites a section the owner didn't ask to change.
