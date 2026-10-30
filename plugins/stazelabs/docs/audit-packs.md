# Audit packs

The four audit skills (`/stazelabs:hygiene`, `/stazelabs:continuity`, `/stazelabs:qa`, `/stazelabs:update-docs`) carry the method: rotate focus, sweep, verify in the main loop, get approval, file or edit, then record the run. What to look for in a particular project lives in that project's **audit pack**, one Markdown file per skill, committed:

    .claude/agent-workflow/audits/<skill>.md

A skill reads its pack after the profile. A missing pack stops the skill: "No audit pack for /stazelabs:<skill>: run /stazelabs:setup to scaffold one." Setup copies the templates in `../templates/audits/` and never overwrites an existing pack. Packs are project-owned: when the owner rules a dropped finding intentional, the skill offers to add it to the pack's **Known non-findings**, and it lands with the run's state PR.

A skill finds a section by its exact `##` heading. A section marked *optional* may be absent. The other headings must exist, though their body may be "none". Anything outside these headings is free text the skill reads as context. A pack can sit beside helper files (`audits/<skill>/...`) and cite them by path.

Run state lives at `.claude/agent-workflow/state/<skill>.json`. A missing file means a first run. [landing-state.md](landing-state.md) describes how it reaches main.

## hygiene: engineering health, read from source

| Heading | What goes there |
|---|---|
| `## Standards` | The documents and rule files to read in full before sweeping, and which of their sections matter. |
| `## Pre-pass` | Commands that run before any subagent (build, vet, lint, coverage), plus optional manual tools and when to use them. Tooling findings are context, never tickets. |
| `## Dimensions` | A numbered table: `#`, dimension name, what it hunts, in this project's vocabulary. Follow it with any cross-cutting invariants and which dimension owns each. |
| `## Search surface` | The paths subagents search, and what they skip. |
| `## Known non-findings` | Deliberate choices never to file, one bullet each, with the reason. |
| `## Verification notes` *(optional)* | How to confirm each dimension's claims in this codebase: which reference forms to grep for dead code, where middleware hangs, and so on. |

## continuity: UI, UX and copy standards, read from source

| Heading | What goes there |
|---|---|
| `## Standards` | The documents that hold the written UI and copy rules, and the component definitions to read. |
| `## Dimensions` | A numbered table: `#`, kind (`deviation` or `discontinuity`), dimension, what it checks against. Deviation rows quote the written rule. Discontinuity rows name the method subsection. |
| `## Methods` | One `### <n>. <name>` subsection per dimension that needs more than the table: the shared components to measure adoption of, the grep for a layout hazard, the peer groups of surfaces. |
| `## Search surface` | The paths subagents read (sources, never generated output). |
| `## Known non-findings` | Deliberate exceptions, including the peer-check ones where a difference is correct. |

## qa: the running app, driven through a browser

| Heading | What goes there |
|---|---|
| `## Standards` | The documents that name the conventions a runtime defect can break. |
| `## Never targets` | Servers, databases, tunnels, hosts and accounts the run must never touch. A command whose output names one is a stop. |
| `## Boot` | Exactly how to start a disposable target in the background (environment, port choice, build, start command), the health URL, where its log is and its format, how to sign in, and how to get elevated or second accounts. It must record the PID so cleanup can stop the process by PID. |
| `## Areas` | The flow slices (letter, flow, what to walk) and the cross-cutting passes (letter, what to exercise). Add a `### Pass <X>` subsection for a pass that needs app-specific setup, such as role-gating accounts. |
| `## Limits` | The project's absolute limits for a run: email, model calls, outbound network, destructive admin tools. |
| `## Triage` | Noise specific to this app's environment, how to check the scratch data directly, and the log greps (in the log's real format) with the positive pattern that proves them. |
| `## Code map` | Where to trace a defect: routes, handlers, view sources, client JS. Name the generated files that are never evidence. |
| `## Cleanup` | What to remove after the run beyond stopping the server and closing tabs. |
| `## Known non-findings` | Behavior that looks wrong and is intended. It may point at the continuity pack's list. |

## update-docs: reconcile prose with the code

| Heading | What goes there |
|---|---|
| `## Standards` | The document that is the conventions contract, and the rule that its conventions are never changed by a docs sweep. |
| `## Ground truth` | Commands that collect the structural facts docs claim: package lists, routes, migrations, workflows, make targets. |
| `## Surfaces` | A table: path or glob, then its treatment (in scope, status column only, only if named, and so on). |
| `## Frozen` | Paths never edited: dated specs and plans, generated files. |
| `## Partitions` | How to split the sweep across parallel readers, one area each. |
| `## Voice` | The project's copy rules to fix in passing. |
| `## Extra rules` *(optional)* | Per-surface rules with a higher bar, such as end-user help articles: file shape, required sections, link rules, the tests that pin them. |
| `## Verify` | Which check to run per kind of change (markdown only, or files under a source tree), and generated output a docs edit can legitimately move. |
