---
name: plan
description: Draft an implementation plan for one ticket, get it approved, then post the plan to the ticket as a comment and set its Model label (fable/haiku/sonnet/opus) to the model best suited to do the work. Use when the user runs /stazelabs:plan with a ticket id or URL (e.g. "/stazelabs:plan EMAIL-12"), or asks to plan, scope or spec out a ticket without building it.
argument-hint: <ticket-id>   e.g. EMAIL-12
---

# /stazelabs:plan: turn a ticket into an approved, model-tagged plan

Read one ticket, ground a concrete plan in the actual codebase, get the owner's
approval, then persist it: post the plan as a comment on the ticket and set its
**Model** label to the tier that should do the work. This skill **plans only**. It
never writes product code, branches or PRs (that's `/stazelabs:ticket`, which reads
ticket comments for plans).

Work the steps in order.

## 0. Read the project profile

Read `.claude/agent-workflow/profile.json` at the project root (`${CLAUDE_PROJECT_DIR}`).

Stop, write nothing, and say exactly this when any of the following holds:
- the file is missing: "This project isn't set up for /stazelabs:plan yet: run /stazelabs:setup."
- `version` is lower than 1: "This project's profile is older than this skill expects: run /stazelabs:setup to migrate it."
- any of these keys is absent: `project.authority`, `tracker.kind`, `tracker.team`, `tracker.prefix`, `tracker.modelLabels`, `gate.command`: "The profile is missing <key>: run /stazelabs:setup."

Everything below reads the profile by its key names. Never substitute a remembered value from another project.

Then read `${CLAUDE_PLUGIN_ROOT}/trackers/<tracker.kind>.md` and follow its "Finding the tools" section to load the tools it names. If no adapter file exists for `tracker.kind`, stop and say so. The verbs below (read a ticket, read comments, comment, set the Model label, list labels) are the adapter's.

## 1. Resolve the ticket
- The argument is a ticket id (`<tracker.prefix>-<n>`) or a tracker URL; extract the identifier. If none was given, ask for it and **stop**.
- Read the ticket: `title`, `description`, `labels`, team, `identifier`, `url`, and whether it has sub-issues.
- **Read the description in full, then read every comment.** Scope decisions and clarifications often live in comments.
- **Epic guard:** if the ticket has sub-issues, one plan doesn't fit. Tell the owner and recommend `/stazelabs:plan` per child; write a high-level plan for the epic only if asked. Don't model-tag an epic parent by default.

## 2. Ground the plan in the codebase
A plan is only useful if it names real files, functions and patterns:
- Explore the areas the ticket touches (the `Explore` agent for broad sweeps; read critical files directly). Find what to **reuse**: existing helpers, shared components, existing queries and patterns the codebase already has for the same job. Prefer extending a sibling over adding a new abstraction.
- The documents in `project.authority` (the instruction file, the specs folder) are the authority. A plan that breaks one of their invariants isn't done. Read the sections that touch the ticket's area before drafting.
- **Design decision needed?** If the ticket turns on a product or design choice that the description, comments and the authority documents don't settle, say so in the draft, name the choice and the options, and **stop for the owner**. Don't invent scope. A ticket that is only design work gets the `fable` label (step 4).

## 3. Draft the plan
Follow the project's plan style (if it keeps plans in a folder such as `docs/superpowers/plans`, match any file there), sized to the ticket:
- **Goal**: what the owner gets, in one or two sentences.
- **Approach**: the recommended implementation, not a survey. Note any ruling you made and why.
- **Files**: Create / Modify / Test, with real relative paths. For a pattern repeated over many files, describe it once and list a few.
- **Interfaces**: what it consumes and what it produces, with signatures for new exported functions, types, queries and views.
- **Steps, test-first**: each step starts with the failing test (name it, say what it asserts), then the implementation, then the command that shows it green.
- **Verification**: the gate, quoted from `gate.command`; `gate.smoke.command` when the change touches any of `gate.smoke.paths`; plus any manual flow.
- **Risks and out of scope.**
- **Size note**: if the work is big enough for a plan file (several tasks, a migration plus UI, or more than one package), say so and point `/stazelabs:ticket` to superpowers:writing-plans (and superpowers:brainstorming first if it needs a spec). The comment is then the outline; the full plan is written at the start of `/stazelabs:ticket`.

Draft it in the scratchpad if it's long, inline for a small ticket. Match the project's copy rules from its authority documents (healthcheck, for instance: sentence case, no exclamation points).

## 4. Pick the Model label
Choose exactly one tier; the label names are `tracker.modelLabels.<tier>`:

| Tier | When | Signals |
|---|---|---|
| **fable** | Planning, spec or research, not implementation | the deliverable is a plan, spec or decision: research spikes, design write-ups, propose-first passes. haiku is the lightest *implementation* tier. |
| **haiku** | Mechanical, one pattern, low judgment | find/replace sweeps, copy fixes, a help article, following one sibling pattern verbatim |
| **sonnet** | Moderate correctness or refactor | a handler plus query plus template slice, error handling across several call sites, extracting a shared helper, a well-scoped job |
| **opus** | High judgment, architectural or broad | a new rule family, a new package or abstraction, a migration plus jobs plus UI, anything touching the project's core invariants |

Base the choice on the **plan you drafted**, not the ticket's priority. State the pick with a one-line rationale.

## 5. Get approval: the one gate
Present the plan **and** the proposed Model label in chat, then **stop and wait** for approval. Iterate on feedback. Write nothing to the tracker before explicit approval.

## 6. Persist to the ticket
Once approved:
- **Post the plan as a comment** (adapter verb "Comment") with the plan as markdown, real newlines, no escape sequences. Don't overwrite the description.
- **Set the Model label** (adapter verb "Set the Model label"): remove any of `tracker.modelLabels`' values already on the ticket, add the chosen one, touch nothing else. If the label doesn't exist in the team (adapter verb "List labels"), say so and suggest `/stazelabs:setup`, which can create the group.

## 7. Report
The ticket (title and URL), the Model label and why, a link to the plan comment, and whether the work needs a plan file. Note it's ready for `/stazelabs:ticket`.

## Guardrails
- **Hard stops:** no ticket id; the ticket is an epic; scope still ambiguous after description, comments and code; a design decision only the owner can make. Ask, don't guess.
- **Plan only.** Never branch, edit product code, open a PR or change ticket status. The only writes are one comment and the Model label.
- **Never drop existing labels.** Label writes are incremental.
- Nothing goes to the tracker until the owner approves.
