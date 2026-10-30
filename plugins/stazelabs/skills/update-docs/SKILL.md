---
name: update-docs
description: Sweep the project's documentation for drift against the code, verify every discrepancy, apply the corrections, then run the project's checks, open a PR, merge it in the project's style, and record the sha. The surfaces, frozen paths and extra rules come from the project's audit pack. Use when the user runs /stazelabs:update-docs, or asks to refresh, audit or reconcile the documentation so it reflects what actually shipped.
argument-hint: (none) sweeps everything; or narrow it ("help", "ops", "readme, claude")
---

# /stazelabs:update-docs: reconcile the documentation with reality

Docs are load-bearing: the instruction file is the conventions contract, the README and the runbooks are what the owner works from, and help content is what a customer reads. All of them drift silently: a package ships, a rule changes, a roadmap item merges, and nobody goes back. This skill goes back. It finds where the prose no longer matches the code, **verifies each discrepancy against the code**, fixes the prose, and lands the result on main through a PR.

**Reality wins.** When doc and code disagree, the doc changes, unless the code is what's wrong; then record it and offer a ticket (section 7). **This skill never changes product code.**

Work the steps in order.

## 0. Read the profile and the pack, then preflight

Read `.claude/agent-workflow/profile.json` at the project root (`${CLAUDE_PROJECT_DIR}`).

Stop, write nothing, and say exactly this when any of the following holds:
- the file is missing: "This project isn't set up for /stazelabs:update-docs yet: run /stazelabs:setup."
- `version` is lower than 1: "This project's profile is older than this skill expects: run /stazelabs:setup to migrate it."
- any of these keys is absent: `repo.mainBranch`, `repo.mergeStyle`, `gate.command`, `hardStops`: "The profile is missing <key>: run /stazelabs:setup."

Everything below reads the profile by its key names. Never substitute a remembered value from another project.

Read the pack at `.claude/agent-workflow/audits/update-docs.md`. If it's missing, stop: "No audit pack for /stazelabs:update-docs: run /stazelabs:setup to scaffold one."

The git tree must be clean:
- Run `git status --porcelain`. If anything is uncommitted, **stop** and tell the user. Never bundle unrelated work.
- `git fetch origin`, check out `repo.mainBranch`, `git pull --ff-only`, then run `git status --porcelain` again, since a checkout can bring changes.
- `git checkout -b docs/update-<YYYY-MM-DD>`, adding `-2` if that branch exists.

## 1. Establish ground truth before reading a doc

Docs are checked against the code, never against each other's confidence.

- Read everything the pack's **Standards** section names, in full. The conventions contract is the authority.
- Read `.claude/agent-workflow/state/update-docs.json`: `{"sha": "...", "pr": null}`, the main commit the last sweep reconciled through. Capture `git rev-parse --short HEAD` now; that is this run's new `sha`. On a first run, there's no state file: use the last ~100 commits.
- Diff the world since then with `git log --oneline <sha>..HEAD`. Feature, refactor and merge commits, and new top-level packages or modules, are the highest-yield drift signals. A shipped feature whose doc says "not started" is exactly what this sweep catches.
- Run the pack's **Ground truth** commands to collect the structural facts the docs claim.

## 2. Scope: what's in, what's frozen

The pack's **Surfaces** table says what each doc gets, and its **Frozen** list is never edited. Two rules hold whatever the pack says:
- The conventions contract is corrected for **fact** only: paths, target names, package lists, what is built. **Never invent, relax or delete a convention.** A rule change is a product decision, not a docs fix.
- Dated specs and plans are design intent and history. They are never edited, except for a status column the pack explicitly opens.

When the user gives an argument, narrow the sweep to it and say so in the report.

## 3. Sweep: parallel readers, one area each

Spawn `general-purpose` subagents **in a single message**, one per area in the pack's **Partitions**.

Each brief carries:
- the area's files, and the Frozen list;
- the ground-truth facts from section 1;
- the drift checks of section 4;
- the pack's **Voice** rules, and the **Extra rules** for its area;
- **read-only**: agents report, they don't edit.

A finding is the file and line, the claim as written, the contradicting evidence at `file:line` in the code, and a proposed replacement. Evidence, not adjectives. Cap each agent at its 15 strongest.

## 4. What counts as drift

- **Built-versus-planned inversion**: a doc calls something planned or not started when it shipped, or lists as built something that was cancelled. Highest severity.
- **Dead references**: a linked file, package, path, make target, environment variable, route or symbol that no longer exists or was renamed. Verify that every relative link resolves and every cited symbol exists.
- **Stale mechanics**: a described flow the code no longer performs.
- **Cross-doc contradiction**: two in-scope docs disagree. Resolve it against the code, and fix both.
- **Missing coverage**: a shipped package or module that the instruction file's layout section doesn't mention. Add one line in the existing style.
- **Voice**: the pack's Voice rules, fixed in passing.

**Not drift:** a spec or dated plan that diverges from the build, or a frozen plan describing a past state.

## 5. Extra rules

Apply the pack's **Extra rules** to the surfaces they name. These usually cover end-user content: its file shape, its required sections, link resolution, and the tests that pin them. Run a surface's named tests as soon as you touch a file in it, not at the end.

## 6. Verify each finding yourself, then edit

Don't apply a subagent's finding on its word. Open the cited code and confirm it. A finding that doesn't survive is dropped silently.

Then edit. Match each doc's voice and structure, and make the **smallest correct edit**: repair the wrong sentence rather than restructuring around it.

## 7. Code that is wrong, not docs

Sometimes the doc is right and the code drifted, such as a convention silently violated. **Don't fix the code here.** Record it, and at the end offer to file a ticket: read `${CLAUDE_PLUGIN_ROOT}/trackers/<tracker.kind>.md`, load its tools, and create the ticket in `tracker.team` with an existing type label plus a Model label from `tracker.modelLabels`, after a yes. `/stazelabs:hygiene` owns code drift; this skill owns prose.

## 8. Verify, commit, PR, merge

- Run the check the pack's **Verify** section names for the kind of change you made. When the change touches files the project's gate covers, run `gate.command` and see it green. Commit generated output that a docs edit legitimately moved, as the pack's Verify section describes.
- If you can't reach green, **stop**, leave the work on the branch, and report.
- Update the state file (section 9) in the same commit if the sha is known, else in a follow-up commit on the branch. Commit `docs: <what was reconciled>`, with a body listing the areas swept and the substantive corrections, ending with the attribution line from the session's system reminder.
- `git push -u origin <branch>`, then `gh pr create --base <repo.mainBranch>`. The body covers the areas swept, the corrections, and anything deliberately left alone, and ends with the session's PR attribution line.
- When `repo.neverTriggerCI` is true, **never trigger CI**.
- Wait for `mergeStateStatus` to read `CLEAN` (GitHub often says "Base branch was modified" right after a push). Then run `gh pr merge <n> --<repo.mergeStyle>`, adding `--delete-branch` when `repo.deleteBranchOnMerge` is true. If the merge is rejected for any other reason, **stop** and report.
- Check out `repo.mainBranch` and `git pull --ff-only`. Delete any local branch that lingers.

## 9. Record the run

`.claude/agent-workflow/state/update-docs.json` holds one object: `{"sha":"<short sha>","pr":<number or null>}`.
- `sha` is the main commit this sweep reconciled through: HEAD at section 1. The next run diffs from it, so nothing merged while the sweep ran is skipped.
- `pr` is this sweep's PR number.

Write the sha before the commit. Once the PR number is known, set `pr` on the same branch before merging. Overwrite the file; don't append.

## 10. Final check and report

- `git status --porcelain` must be empty, and the branch must be `repo.mainBranch`. Anything else isn't success.
- Report: the areas swept, findings verified versus dropped, corrections by file, anything left alone and why, the PR URL, the merge commit sha, and any code drift found, with an offer to file tickets.

## Guardrails

- **Hard stops:** a dirty working tree, a check that can't be made green, `gh` unauthenticated or the PR unmergeable, and every `hardStops` item. Documenting a `hardStops` action is fine; running one is not.
- **Never edit** the Frozen paths or generated files.
- **Never change product code**, and never change a convention: only correct statements of fact.
- **Never invent a feature, a ticket id, a PR number or a date.** An unverifiable claim is deleted or left alone, never replaced with a plausible one.
- Never push to main, and never force-push.
