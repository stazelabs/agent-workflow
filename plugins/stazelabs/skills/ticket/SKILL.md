---
name: ticket
description: Resolve a ticket end to end: set it In Progress, branch from fresh main, implement test-first on the model its Model label names, pass the project's gate (and smoke for UI), run a final review, open a PR, merge it, and close the ticket. An epic (a ticket with sub-issues) fans out over its children after one confirmation. Use when the user runs /stazelabs:ticket with a ticket id or URL (e.g. "/stazelabs:ticket PROJ-12"), or asks to resolve, build, knock out or finish a ticket or epic from start to merge.
argument-hint: <ticket-id>   e.g. PROJ-12
---

# /stazelabs:ticket: resolve a ticket start to finish

Take one ticket all the way: branch, implement, verify, review, open a PR, merge it
in the project's style, update local main and close the ticket. Run autonomously. The
PR is the review artifact and the record of rulings. Requires `gh` to be authenticated.

**Hard stops** (ask the owner in chat, for that specific action, before going on) are only these:
- each item in the profile's `hardStops` list, in the owner's words;
- anything destructive (deleting data or branches you didn't make, database resets, force-push, rewriting history);
- changing a recorded product decision: any document in `project.authority`.

Everything else is a ruling: decide, record it in the ledger, and list it in the PR. When `repo.neverTriggerCI` is true, **never trigger CI**: the local gate is the gate.

Work the steps in order.

## 0. Read the project profile

Read `.claude/agent-workflow/profile.json` at the project root (`${CLAUDE_PROJECT_DIR}`).

Stop, write nothing, and say exactly this when any of the following holds:
- the file is missing: "This project isn't set up for /stazelabs:ticket yet: run /stazelabs:setup."
- `version` is lower than 1: "This project's profile is older than this skill expects: run /stazelabs:setup to migrate it."
- any of these keys is absent: `project.authority`, `tracker.kind`, `tracker.prefix`, `tracker.states.started`, `tracker.states.done`, `tracker.modelLabels`, `repo.mainBranch`, `repo.branchPattern`, `repo.commitFormat`, `repo.mergeStyle`, `gate.command`, `review.model`, `review.skipUnderLines`, `review.alwaysReviewPaths`, `hardStops`: "The profile is missing <key>: run /stazelabs:setup."

Everything below reads the profile by its key names. Never substitute a remembered value from another project.

Then read `${CLAUDE_PLUGIN_ROOT}/trackers/<tracker.kind>.md` and follow its "Finding the tools" section to load the tools it names. If no adapter file exists for `tracker.kind`, stop and say so. The verbs below (read a ticket, read comments, set state, comment, set the Model label, list children) are the adapter's.

Confirm the superpowers plugin is installed: its skills (`superpowers:test-driven-development`, `superpowers:requesting-code-review`) appear in this session's skill list. If they don't, stop: "This skill needs the superpowers plugin. Install it with /plugin install superpowers@claude-plugins-official, then run again."

## 1. Read the ticket and set it started
- The argument is a ticket id (`<tracker.prefix>-<n>`) or a tracker URL; extract the identifier. If none was given, ask for it.
- Read the ticket: `title`, `description`, `identifier`, `url`, `status`, `labels` (the **Model** label drives §1b) and whether it has sub-issues.
- **Read the description in full, then read every comment.** A `/stazelabs:plan` comment is the plan; scope decisions often live in comments.
- **Sub-issues → epic mode (§1a).** Don't resolve the parent directly.
- Set the ticket to `tracker.states.started` (adapter verb "Set state").
- If scope is still unclear after description, comments and code, make the narrowest reading that fits the authority documents, and record it as a ruling. Stop only if the clear reading would change a recorded product decision.

## 1a. Epic mode: resolve the children in sequence
1. **Enumerate:** list the epic's children (adapter verb "List children"), paging until exhausted.
2. **Filter:** drop children already done, canceled or duplicate, children that are epics themselves, and children labeled `tracker.modelLabels.fable` (spec work, §1c). Record what you dropped and why.
3. **Order:** blockers first (read each with relations; never start a child before its blockers are done), then priority, Urgent to Low.
4. **Confirm once.** Post the ordered list (each child as its own branch and PR, with its resolved model from §1b) plus the skipped children and reasons. Get one go-ahead; after it, run the rest unattended.
5. **Loop sequentially.** Run the full single-ticket flow (§2 to §10) for each child before starting the next, each from fresh main. Never parallelize.
6. **Isolate failures.** A child that can't reach green, or hits a hard stop, is skipped: leave its work on its branch, record it, continue. A dirty tree between children, or `gh` being unavailable, halts the batch. Check `git status --porcelain` is empty before each child.
7. **Close the parent.** Comment on the epic with each child's outcome (PR and merge sha, or skipped and why). Set it to `tracker.states.done` only if every child reached done.

## 1b. Pick the model from the Model label
The Model label (one of `tracker.modelLabels`' values) names the model for the implementation. Resolve a target once per ticket (per child in an epic):

| Tier | Agent tool `model` | Implementation path |
|---|---|---|
| `haiku`  | `haiku`  | delegate to a subagent (§4b) |
| `sonnet` | `sonnet` | delegate to a subagent (§4b) |
| `opus`   | `opus`   | inline if this session is Opus, else delegate (§4b) |
| `fable`  | none     | spec work, not code (§1c) |
| *(none)* | the session's model | inline (§4a) |

A skill can't change its own main-loop model, so a label that differs from the session's model is honored only by delegating. Print one line before implementing, e.g. `Model: sonnet (labeled), delegating implementation to a subagent` or `Model: opus (no label, session model), running inline`. The final review (§6) stays on `review.model` whatever the label says.

## 1c. Fable-labeled tickets
`fable` means the deliverable is a plan or spec. Don't write code: note that it's labeled for spec work, suggest `/stazelabs:plan <id>` (or superpowers:brainstorming for a spec), and stop. In an epic, skip that child with this reason.

## 2. Preflight and branch from fresh main
- `git status --porcelain` must be empty. If it isn't, don't bundle unrelated work: report it and stop.
- `git fetch origin`, `git checkout <repo.mainBranch>`, `git pull --ff-only origin <repo.mainBranch>`, then check `git status --porcelain` again.
- `git checkout -b <branch>` where `<branch>` is `repo.branchPattern` with `{prefix_lower}` = the prefix lowercased, `{number}` = the ticket number, `{slug}` = a few lowercase words from the title (`PROJ-12` "Show domain favicons on cards" → `proj-12-domain-favicons`). If the branch exists, check it out and merge main into it (never rebase a pushed branch), or suffix `-2`.

## 3. Choose the flow
- **Small ticket** (a copy fix, one handler or template tweak, a doc article, a single-package bug): skip spec and plan. Go test-first with superpowers:test-driven-development: the failing test, then the fix, then green.
- **Non-trivial ticket** (several tasks, a migration, a new package, core rule changes, anything a `/stazelabs:plan` comment called big enough for a plan file):
  1. superpowers:brainstorming, only if the ticket needs a design that the ticket, comments and authority documents don't settle. The spec goes where the project keeps specs (`docs/superpowers/specs/<date>-<topic>-design.md` by convention).
  2. superpowers:writing-plans, writing the plan file where the project keeps plans (`docs/superpowers/plans/<date>-<topic>.md` by convention) in the project's style: Files, Interfaces, test-first steps.
  3. superpowers:executing-plans, inline, keeping a ledger in the scratchpad: each task's state, and every ruling with its reason and the cost if wrong.
  4. superpowers:test-driven-development for every step.
  - Specs and plans are frozen history once merged: add new ones, never rewrite old ones.

## 4. Implement
Keep the diff scoped to the ticket. The documents in `project.authority` are the authority on layout, invariants and copy; read the sections that touch the ticket's area before changing it, and don't rely on memory of another project's rules.

### 4a. Inline
Do the work yourself through §3's flow.

### 4b. Delegated
- `Agent` with `model: <target>` and `subagent_type: general-purpose`.
- Give it everything: the ticket id and title, the full description and the comments or plan you read, the branch (already checked out), the plan file path if there is one, the authority documents to follow and the rule to go test-first, `gate.command` and `gate.notes`, and the scope boundary.
- It implements and runs the gate in the working tree, then reports what changed, its rulings and the gate result. It does **not** commit, push or touch the tracker.
- Your §5 run is the gate. Never merge on a subagent's word.

## 5. Verify and review together: never merge red
The gate, smoke and the review all read the same finished tree and don't depend on each other, so start them at once and wait for all of them. Nothing in this section edits the tree until every result is in.

1. **Start the gate in the background** (`Bash` with `run_in_background`): `gate.command`, exactly as written in the profile.
2. **Start smoke in the background too, when the profile has `gate.smoke` and the diff touches it.** The rule is mechanical: run `git diff --name-only <repo.mainBranch>...HEAD`; if any path starts with one of `gate.smoke.paths`, run `gate.smoke.command`. Otherwise skip it and say so in the PR's Checks section.
3. **Dispatch the reviewer in the same turn (§6)**, unless §6 says the ticket is below the review threshold.
4. **Wait for all of them.** Don't poll; the notifications arrive. Then read every result.

Notes on the gate: quote each line of `gate.notes` to yourself before reading a failure; they name the project's known quirks and their fixes. Generated files the gate rewrites are committed, never hand-edited.

If the gate or smoke can't be made green, don't merge: leave the work on the branch and report (in an epic, skip the child).

## 6. Final review and one fix pass
**Threshold.** Skip the review, and say so in the PR body, when the diff against main is under `review.skipUnderLines` changed lines and touches none of `review.alwaysReviewPaths` (prefix match, or glob for entries like `*.sql`). Changes of that size ship on the gate alone. Everything else is reviewed.

- Dispatch a reviewer with the `Agent` tool, `model: <review.model>`, using the code-reviewer template from superpowers:requesting-code-review. Give it the diff against main (`git diff <repo.mainBranch>...HEAD`), the ticket, the plan or spec, and the authority documents' invariants as the review focus. Start it in the same turn as the gate (§5), not after.
- Grade its findings by effect. Fix every Critical and Important in **one pass, test-first** (each fix starts with a failing test). While iterating on a fix, run only the affected packages' tests. When the pass is done, run `gate.command` from §5 once more (and smoke, if §5's rule applied); no second review.
- Minors are deferred, not fixed, and listed in the PR body.

## 7. Commit on the branch
Commit subjects follow `repo.commitFormat` (`{Area}: {summary} ({id})` gives `Admin: return to the list after Re-evaluate (PROJ-678)`), with a short body of what and why. End the message with the attribution lines this session specifies (the harness names the model that did the work). Several focused commits are fine.

## 8. Open the PR, wait for CLEAN, merge
- `git push -u origin <branch>`. Never push to main, never force-push.
- `gh pr create --base <repo.mainBranch> --title "<plain summary> (<id>)" --body ...`. If a PR already exists for the branch, reuse it. The body has these sections:
  - **What changed**: plain English, by effect.
  - **Rulings**: each decision made without the owner, with its reason.
  - **Final review**: what the review found and how each fix was tested (name the tests), or why it was skipped.
  - **Deferred minors**.
  - **Checks**: the gate command and the smoke command with their results.
  - End with the PR attribution line this session specifies.
- Wait until `gh pr view <n> --json mergeStateStatus` says `CLEAN`. GitHub can say "Base branch was modified" right after a push; wait and retry. Never dispatch a workflow to get there.
- `gh pr merge <n> --<repo.mergeStyle>` plus `--delete-branch` when `repo.deleteBranchOnMerge` is true. If the merge is refused, don't override protections: leave the PR open and report what blocks it.
- Capture the merge sha: `gh pr view <n> --json mergeCommit`.

## 9. Update local main and close the ticket
- `git checkout <repo.mainBranch>`, `git pull --ff-only origin <repo.mainBranch>`; `git branch -D <branch>` if it lingers.
- Comment on the ticket (adapter verb "Comment"): the PR link, the merge sha and a two- or three-line summary of what changed.
- Set the ticket to `tracker.states.done` (adapter verb "Set state").

## 10. Final check and report
- `git status --porcelain` is empty and `git branch --show-current` is `repo.mainBranch`. If not, don't report success: say what's left.
- Report: the branch, the model and whether it ran inline or delegated, what changed, the rulings, the gate and smoke results, the review outcome, the PR URL, the merge sha, and that the ticket is done (with its URL). In epic mode, report per child plus the epic's final state.

## Guardrails
- The hard stops at the top are the only ones that wait for the owner. A red gate, a dirty tree or a refused merge isn't a stop to ask about: it means don't merge, and report.
- One ticket per PR; in an epic, one child per PR.
- When `repo.neverTriggerCI` is true: never trigger CI, never add push or pull_request triggers, never push a deploy tag.
- Never edit an applied migration, a generated file, or a merged spec or plan.
