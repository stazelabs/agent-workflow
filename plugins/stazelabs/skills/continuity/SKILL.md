---
name: continuity
description: Periodic UI/UX/copy standards audit of the project's source that files grouped, model-tagged tickets; audit-only, never fixes. Dimensions, shared components and peer groups come from the project's audit pack. Use when the user runs /stazelabs:continuity, or asks for a UI consistency check, a theming or token audit, a copy and voice sweep, an accessibility pass, a role-gating check, or a check for pages that skip the project's shared components.
argument-hint: (none) rotates focus areas; or name dimensions ("theming, copy", "peers"), or "all"
---

# /stazelabs:continuity: periodic UI/UX/content standards audit

A product's UI coherence is usually enforced by convention, not by a compiler: colors are tokens, status labels go through one component, copy has a fixed voice, roles are gated in the view as well as the route. Drift stays invisible until someone looks for it. This skill is that look: a recurring sweep that turns what it finds into fixable tickets.

It hunts **two** kinds of drift, and they need different evidence:

- **Deviation**: the code diverges from a written rule. The evidence is the quoted rule.
- **Discontinuity**: no written rule is broken, but the app is internally uneven. A shared component is adopted on some pages and not others, or a surface lacks what its peers have. The evidence is **the peer set**: the sibling surfaces that do it the other way. No quoted rule is required, and demanding one is what lets these hide.

The pack's **Dimensions** table marks each dimension's kind.

**This skill finds and files. It never fixes.** No product code, no branches, no PRs. The output is verified findings plus tickets that `/stazelabs:ticket` can pick up later.

Work the steps in order.

## 0. Read the project profile and the pack

Read `.claude/agent-workflow/profile.json` at the project root (`${CLAUDE_PROJECT_DIR}`).

Stop, write nothing, and say exactly this when any of the following holds:
- the file is missing: "This project isn't set up for /stazelabs:continuity yet: run /stazelabs:setup."
- `version` is lower than 1: "This project's profile is older than this skill expects: run /stazelabs:setup to migrate it."
- any of these keys is absent: `tracker.kind`, `tracker.team`, `tracker.modelLabels`, `repo.mainBranch`, `repo.mergeStyle`, `hardStops`: "The profile is missing <key>: run /stazelabs:setup."

Everything below reads the profile by its key names. Never substitute a remembered value from another project.

Then read `${CLAUDE_PLUGIN_ROOT}/trackers/<tracker.kind>.md` and follow its "Finding the tools" section. If no adapter file exists for `tracker.kind`, stop and say so.

Read the pack at `.claude/agent-workflow/audits/continuity.md`. If it is missing, stop: "No audit pack for /stazelabs:continuity: run /stazelabs:setup to scaffold one." Then **read everything its Standards section lists, in full**: those documents are the specification for this audit. A deviation finding must trace to a written rule. A "finding" that isn't grounded in a stated standard is an opinion, and opinions don't get filed. Discontinuity dimensions are graded against the peer set instead (section 4b).

## 1. Pick this run's focus areas

Read `.claude/agent-workflow/state/continuity.json` (`{"runs":[]}` when missing; shape in section 7). It records which dimensions each prior run covered, and when. Each run's `note` records what was dropped and why: read the last one so a refuted claim isn't re-verified from scratch. Then list the commits since that run with `git log --oneline --since='<date> 00:00'`. A bare date uses the current time of day and silently drops that morning's commits. New view files and `feat` scopes are where fresh drift lives, so name them in the subagent briefs.

**Default: sweep the 3 dimensions least recently covered, at least one of them a discontinuity dimension.** If the user named dimensions, use those. If they said `all`, do them all, which is expensive, so confirm first.

## 2. Sweep: one subagent per dimension, in parallel

Spawn one `general-purpose` agent per selected dimension, **all in a single message** so they run concurrently. Brief each one precisely, because a vague brief returns vague findings. Each agent's prompt must include:

- For a deviation dimension, its rules **quoted from the Standards documents**, so the agent doesn't re-derive them. For a discontinuity dimension, or any dimension with a subsection under the pack's **Methods**, that method quoted the same way.
- The pack's **Search surface**. Never generated output.
- The pack's **Known non-findings**, verbatim.
- The required output shape. For each finding: the evidence (a quoted standard for a deviation, the enumerated peer set for a discontinuity), and `file:line` for every occurrence **and for at least two peers that do it the other way**. Then a one-line description of the drift and a proposed fix. Ask for **evidence, not adjectives**: a finding with no line number is not a finding.
- An instruction to report **at most the 10 strongest findings** for its dimension, ranked by how visible the drift is to a person using the app.

These rules apply on top of any pack method:

- **Partial adoption: measure, don't spot-check.** For each shared component, count call sites both ways and report the ratio with both lists. **The finding is the tail, not the convention.** File "finish X on the remaining N surfaces" with the exact remaining list, never "X is inconsistent". A convention below roughly a third adoption is a different report: say so plainly, and ask whether it's still the intended direction rather than filing a sweep ticket.
- **Narrow viewport from source** can only *suspect* a rendered defect. Say "likely breaks below the small breakpoint", never "confirmed broken". Proving it takes a browser at a real width, which is `/stazelabs:qa`'s narrow pass. If the same row shape appears three or more times, file "extract X", not "fix N rows".
- **Peer check:** walk each surface in a pack peer group and ask what its siblings have that it lacks. Check the empty state, the return path, reachability (is the route linked from anywhere?), chrome parity, and where the person lands after a mutation. The evidence for each is the odd surface's `file:line` **plus** the sibling that does it.

## 3. Known non-findings

The pack's list is final. Pass it to every subagent and enforce it at verify time. Generated files are never evidence, and dated specs and plans are not audited. If a subagent surfaces one of these anyway, drop it silently.

## 4. Verify in the main loop: this is the gate that matters

Subagent findings are claims, not facts. **Before anything reaches a ticket, open the cited file and confirm the drift is real.** Do not delegate this back out.

For each candidate finding:
1. `Read` the cited lines. Does the code do what the finding says?
2. Does it clear its dimension's evidence bar: a written rule, or the peer test in section 4b?
3. Is it already covered by an open ticket? Check with the adapter's search verb (the standard's keywords, `tracker.team`) before filing anything new.
4. Is the proposed fix consistent with the repo's idioms, reusing the existing component rather than inventing one?

Drop anything that fails a check. **A short list of confirmed findings beats a long list of plausible ones.**

### 4b. The peer test: the bar for discontinuity dimensions

A discontinuity finding survives only if **all four** hold. Read the peers yourself:

1. **The peer set is real and named**: at least two sibling surfaces, opened and confirmed, that do it the other way. One peer is a coin flip, not a pattern.
2. **The peers are structural siblings**, within one of the pack's peer groups. An admin page is not a peer of an app page.
3. **The odd one out has no stated reason**: nothing in the Standards documents, the pack, or a code comment explains the divergence. If something does, drop the finding and list it in section 5.
4. **A person would notice**: the asymmetry costs someone a capability, a path or a consistent expectation. Internal-only unevenness is out of scope; mention it in the report instead.

The failure mode is over-filing on **coincidence**. Two pages differing is the normal texture of a codebase. The finding is a difference with no reason behind it.

### 4c. Group the survivors

Group survivors **by the standard they violate** (deviation) or **by the component or convention that's uneven** (discontinuity), not by file. "Raw hues instead of tokens across 6 templates" is one ticket, while nine one-line tickets are backlog spam. Don't merge a deviation and a discontinuity into one ticket, even when they touch the same file.

## 5. Present for approval: the one gate

Show the user, in chat:
- Which dimensions this run covered, and why (rotation, or their argument).
- Each proposed ticket: its title, the standard it enforces (or the peer set it's evening out), the file list, and the Model label you'd set from `tracker.modelLabels`. Use `haiku` for mechanical sweeps, `sonnet` for anything with divergence risk, and `opus` for judgment-heavy or cross-cutting work. Use `fable` only if the user asks.
- For a peer run, the adoption ratios or the surface-by-capability grid in compact form, including the cells you judged legitimately different.
- Anything you found but deliberately dropped, one line each, so the user can overrule.

**Stop and wait for explicit approval.** Filing tickets is an outward, tracker-visible action. Iterate on their feedback before writing anything. When the user calls a dropped finding intentional, offer to add it to the pack's **Known non-findings**, and to the project's instruction file if it belongs there.

## 6. File the tickets

Create each approved ticket with the adapter's create verb:
- **Title**: verb-led, naming the standard and the scope: "Move 5 hand-rolled status pills to the shared badge component".
- **Description**: for a deviation, the standard quoted. For a discontinuity, **the peer set spelled out** ("the Overview, DNS and History tabs all use X; Settings does not"). Then the full `file:line` list, the concrete fix, and a "found by /stazelabs:continuity on <date>" footer.
- **Labels**: list the team's labels first, then apply exactly one Model label plus the existing type label that fits. **Never invent a new label** without asking.
- Leave the status at the team default and set no assignee.

## 7. Update the run state

Write `.claude/agent-workflow/state/continuity.json`:

```json
{
  "runs": [
    { "date": "YYYY-MM-DD", "dimensions": [1, 2, 5], "tickets": ["<PREFIX>-12", "<PREFIX>-13"], "findings": 6, "note": "..." }
  ]
}
```

Append this run, keeping the last ~12. Its `note` names what was clean, what was dropped and why, and any user decision that landed (those also go in the pack). Rotation in section 1 reads this file, so record the discontinuity dimensions even on a run where they produced nothing. Use the real current date from the environment.

Then land it as `${CLAUDE_PLUGIN_ROOT}/docs/landing-state.md` describes. Approved pack edits go in the same commit.

## 8. Report

Summarize: the dimensions covered, findings confirmed versus dropped, tickets filed (identifiers and URLs), and which dimensions are up next run. If a dimension had nothing worth filing, say so plainly: a clean dimension is a real result.

## Guardrails

- **Audit only.** No product-code edits, and no status changes on existing tickets. The only writes are new tickets, the state file and approved pack edits (landed through their own chore PR, section 7).
- **Every finding cites a `file:line`** plus its evidence: a written standard, or a named, verified peer set (section 4b). No taste-based findings, and no peer claim resting on a single peer.
- **Nothing is filed before the user approves** (section 5).
- **Never re-flag a known non-finding**, and never file a duplicate of an open ticket.
- **Never read generated output as evidence**: the source is the truth.
- **Never create a new tracker label** without asking.
- Every `hardStops` item waits for the owner's yes in chat. This skill needs none of them.
