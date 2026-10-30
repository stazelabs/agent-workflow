---
name: hygiene
description: Periodic engineering-health audit of the project's code that files grouped, model-tagged tickets; audit-only, never fixes. Dimensions and known non-findings come from the project's audit pack. Use when the user runs /stazelabs:hygiene, or asks for a code-health, dead-code, duplication, layering, database, security, performance, error-handling or test-coverage audit of the codebase.
argument-hint: (none) rotates focus areas; or name dimensions ("security, dead code"), or "all"
---

# /stazelabs:hygiene: periodic engineering-health audit

An audit of the code: what is dead, what is duplicated, what is in the wrong layer, what is unsafe, what is slow, what is untested. Find, verify, file. **It never fixes.** No product code, no branches for fixes, no PRs for fixes. The output is verified findings plus tickets that `/stazelabs:ticket` can pick up.

What to look for in this project comes from its audit pack. How to look comes from this file.

Work the steps in order.

## 0. Read the project profile and the pack

Read `.claude/agent-workflow/profile.json` at the project root (`${CLAUDE_PROJECT_DIR}`).

Stop, write nothing, and say exactly this when any of the following holds:
- the file is missing: "This project isn't set up for /stazelabs:hygiene yet: run /stazelabs:setup."
- `version` is lower than 1: "This project's profile is older than this skill expects: run /stazelabs:setup to migrate it."
- any of these keys is absent: `tracker.kind`, `tracker.team`, `tracker.modelLabels`, `repo.mainBranch`, `repo.mergeStyle`, `hardStops`: "The profile is missing <key>: run /stazelabs:setup."

Everything below reads the profile by its key names. Never substitute a remembered value from another project.

Then read `${CLAUDE_PLUGIN_ROOT}/trackers/<tracker.kind>.md` and follow its "Finding the tools" section. If no adapter file exists for `tracker.kind`, stop and say so. The verbs below (search tickets, create a ticket, list labels) are the adapter's.

Read the pack at `.claude/agent-workflow/audits/hygiene.md`. If it is missing, stop: "No audit pack for /stazelabs:hygiene: run /stazelabs:setup to scaffold one." Its headings are described in `${CLAUDE_PLUGIN_ROOT}/docs/audit-packs.md`. Then read everything the pack's **Standards** section lists, in full.

## 1. Cheap pre-pass: let the tooling go first

Run the pack's **Pre-pass** commands. **Never spend a subagent on what a linter finds for free**, and never file a ticket for something the project's gate would have caught. Run an optional manual tool only for the dimension the pack ties it to. A real hit from one is a finding. Never add such a tool to the build or to CI.

Feed the output into the sweep as context. When a dimension's tooling is clean, its subagent looks for what tooling can't see (design duplication, layering, scoping bugs), not for lint.

## 2. Pick this run's focus areas

Read `.claude/agent-workflow/state/hygiene.json` (`{"runs":[]}` when missing; shape in section 7). It records which dimensions each run covered, and when. **Also read the last run's `dropped_recheck_next_run` list**: findings that were real but deferred with a re-check condition. Hand each one to the subagent for its dimension as a named item to re-test.

**Default: sweep the 3 dimensions least recently covered**, from the pack's **Dimensions** table. The user's argument overrides this. `all` sweeps every dimension and is expensive, so confirm first.

The pack's cross-cutting invariants belong to whichever dimension the hazard is closest to. Check them when the run touches that area.

## 3. Sweep: one subagent per dimension, in parallel

Spawn one `general-purpose` agent per selected dimension, **all in a single message**. Each brief carries:

- The dimension's row from the pack, and the rules it rests on **quoted from the Standards documents**, not paraphrased.
- The relevant pre-pass output from section 1.
- The pack's **Search surface**, with its exclusions.
- The pack's **Known non-findings**, verbatim.
- The output shape. For each finding: the rule or hazard, `file:line` for every occurrence, the concrete failure or cost, and a proposed fix. **Evidence, not adjectives.** A performance finding with no path and no scale rationale is a guess. A security finding names the attacker and what they get.
- At most the **10 strongest findings** per dimension, ranked **security > correctness > performance > hygiene**.
- **Read-only.** Agents never edit, and never run anything that crosses a `hardStops` item, calls a live paid API, or touches production.

## 4. Known non-findings

The pack's list is final. A subagent that surfaces one anyway is dropped silently. Generated files are never evidence and never fixed by hand, whether or not the pack lists them.

## 5. Verify in the main loop: this is the gate that matters

Subagent findings are claims. **Confirm each one against the code yourself.** Do not delegate verification. Apply the pack's **Verification notes**, and in any project:

- **Dead code:** grep for every way the symbol could be referenced before believing it's dead: templates, generated code, route mounts, string references in scripts, data files, reflection, and test-only use. Compilers rarely catch an unused exported symbol, and this dimension produces the most false positives.
- **Duplication:** open both sites. Near-duplicates that differ in a load-bearing way are not duplicates.
- **Security and correctness:** trace the real route. Is the guard really absent, or does a parent group carry it? Does the query really lack its scope?
- **Performance:** confirm the path is genuinely hot. "Could be slow at scale" with no evidence is not a finding.
- **Dedupe** with the adapter's search-tickets verb in `tracker.team`. When an open ticket already covers the hazard, add to its scope rather than filing a rival ticket, and record that under `scope_adds`.

Drop anything that fails a check. **A short list of confirmed findings beats a long list of plausible ones.** Group the survivors **by root cause**, not by file.

## 6. Present for approval, then file

Show the user:
- the dimensions covered, and why;
- each proposed ticket: title, severity, the hazard, the file list, and a proposed Model label from `tracker.modelLabels` (`haiku` for mechanical work, `sonnet` where there's divergence risk, `opus` for architectural work; `fable` only as `/stazelabs:plan` assigns it);
- one line for each dropped finding, so they can overrule.

**Stop and wait for explicit approval.** Then create each approved ticket with the adapter's create verb:

- **Title**: verb-led, naming the hazard and its scope: "Scope inbox message queries to the workspace to close an IDOR".
- **Description**: the rule or hazard with its quote, the full `file:line` list, the concrete failure, the fix, and a "found by /stazelabs:hygiene on <date>" footer.
- **Labels**: list the team's labels first. Apply exactly one existing type label (a bug-type label when something is wrong, an improvement-type label for cleanup, hygiene or performance) plus one Model label. **Never invent a label** without asking.
- **Priority**: Urgent for a confirmed exploitable security finding, High for data-corruption or auth-bypass risk. Leave the others at the default.

When the user calls a dropped finding intentional, offer to add it to the pack's **Known non-findings**, and to the project's instruction file if it belongs there.

## 7. Update the run state

Write `.claude/agent-workflow/state/hygiene.json`, appending this run and keeping the last ~12:

```json
{
  "runs": [
    {
      "date": "YYYY-MM-DD",
      "dimensions": [1, 5, 8],
      "tickets": ["<PREFIX>-12"],
      "scope_adds": [],
      "findings": 4,
      "dropped_recheck_next_run": ["<finding> -- <why deferred> -- re-raise if <condition>"],
      "note": "What was clean, what was dropped and why."
    }
  ]
}
```

Use the real current date from the environment. Then land it as `${CLAUDE_PLUGIN_ROOT}/docs/landing-state.md` describes. A pack edit from section 6 goes in the same commit.

## 8. Report

Report the dimensions covered, findings confirmed versus dropped, tickets filed (identifiers and URLs), and which dimensions are up next run. A clean dimension is a real result: say so rather than manufacturing a finding.

## Guardrails

- **Audit only.** No product-code edits, and no status changes on existing tickets. The only writes are new tickets, the state file and approved pack edits (landed through their own chore PR).
- Every `hardStops` item waits for the owner's yes in chat, for that specific action. Never push to main, and never force-push.
- **Every finding cites a real hazard and a `file:line`.** No speculative performance or security findings.
- **Nothing is filed before the user approves** (section 6).
- **Never re-flag a known non-finding**, and never file a duplicate of an open ticket.
- **Never use generated files as evidence**, and never propose hand-editing them.
- **Never create a new tracker label** without asking.
- A **live exploitable vulnerability** is reported in chat immediately and prominently, not left to wait its turn in the summary.
