# The workflow

This is the model the skills implement. It grew on a real product over a few hundred tickets; the skills are its procedure, this page is its reasoning.

## The loop

1. **A ticket** exists in the tracker with a description. Comments carry scope rulings and plans; the description is the ask and is never overwritten by a skill.
2. **`/stazelabs:plan`** reads the ticket and every comment, explores the codebase, drafts a plan that names real files and test-first steps, and proposes a **Model label**. Nothing is written until the owner approves in chat. Then the plan goes on the ticket as a comment and the label is set.
3. **`/stazelabs:ticket`** reads the same ticket and comments, sets it started, branches from fresh main, implements test-first on the labeled model, runs the project's gate (and the smoke check if the diff touches UI paths), gets a final review from a stronger model, fixes Critical and Important findings in one pass, opens a PR whose body records every ruling, waits for GitHub to say the PR is clean, merges in the project's style, updates local main, comments the merge sha on the ticket and sets it done.
4. **`/stazelabs-go:preview-deploy`** ships main: it computes a dated tag, shows what will deploy, waits for an explicit yes, pushes the tag, and watches the workflow that re-runs the gate and deploys. A tag that fails the gate never deploys.

Feeding the loop, the **audit skills** (`/stazelabs:hygiene`, `/stazelabs:continuity`, `/stazelabs:qa`) sweep the codebase or the running app on a rotation, verify every claim in the main session, and file grouped, model-tagged tickets only after the owner's yes. They never fix. `/stazelabs:update-docs` is the one audit that edits, and only prose. Each run is recorded in `.claude/agent-workflow/state/<skill>.json` so the next run picks the least recently covered areas.

An **epic** (a ticket with sub-issues) is resolved child by child, each on its own branch and PR, blockers first, after one confirmation of the ordered list.

## Model labels

Each ticket carries one label from a `Model` group. It answers "who should do this?" based on the plan, not the priority:

| Label | Means |
|---|---|
| `fable` | Spec, plan or research. Not implementation. `/stazelabs:ticket` refuses it and points at `/stazelabs:plan`. |
| `haiku` | Mechanical, one pattern, low judgment. |
| `sonnet` | Moderate correctness or a well-scoped refactor. |
| `opus` | High judgment, architectural or broad. |

A session can't change its own model, so a label that differs from the session's model is honored by delegating the implementation to a subagent on that model. The gate and the merge are always run by the main session; a subagent's green is never trusted.

## Rulings and hard stops

The skills run autonomously. Almost every decision is a **ruling**: made, recorded with its reason in the PR body, reviewable afterwards. Only **hard stops** wait for the owner, and the list is short and explicit: the project's own (`hardStops` in the profile, such as "any Fly, DNS or Resend action"), plus two universal ones: anything destructive, and changing a recorded product decision in an authority document.

A red gate, a dirty tree or a refused merge is not a question to ask. It means don't merge, leave the branch, report.

## The gate is local

Stazelabs projects keep CI as manual dispatch and treat the local gate as the gate. The skills never dispatch a workflow and never add push or pull_request triggers. The deploy action re-runs the gate itself, so a deploy is gated twice: once before merge, once before the image builds.

## Review

A diff above `review.skipUnderLines` lines, or touching any of `review.alwaysReviewPaths`, gets a final review from `review.model` before merge. The reviewer gets the diff, the ticket, the plan and the project's invariants. Critical and Important findings are fixed test-first in one pass, the gate runs again, and there is no second review. Minors are listed in the PR as deferred.

## The profile

Everything project-specific lives in `.claude/agent-workflow/` and nowhere else: workflow settings in `profile.json`, and what each audit looks for in `audits/<skill>.md`. A skill that needs a key the profile lacks stops and says so. That rule is what lets one installed plugin serve many projects and lets improvements ship without anyone editing a skill by hand. The keys: [profile.md](../plugins/stazelabs/docs/profile.md). The pack headings: [audit-packs.md](../plugins/stazelabs/docs/audit-packs.md).
