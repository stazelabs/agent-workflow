# agent-workflow

Stazelabs' Claude Code workflow, packaged as a plugin marketplace. One install gives every project on a machine the same ticket-to-merge-to-deploy skills; each project keeps its own specifics (tracker team, gate command, branch style, deploy target) in a small committed profile that the setup skill writes.

## The workflow

You tend the project and drive it through tickets. Everything else is a skill that reads tickets, writes tickets, or lands code.

```
                        you write tickets
                (a one-line placeholder, a note, a full spec)
                                 │
                                 ▼
    ┌────────────────────────────────────────────────────────────┐
    │                          tickets                           │◀──────────┐
    └────────────────────────────────────────────────────────────┘           │
                                 │                                           │
                                 ▼                                           │
         /stazelabs:plan          each ticket: a grounded plan on the        │
                                  ticket, plus its Model label               │
                                 │                                           │
                                 ▼                                           │
         /stazelabs:ticket        one ticket, an epic, or a queue left to    │
                                  run overnight: branch, test-first, gate,   │
                                  review, PR, merge, close                   │
                                 │                                           │
                                 ▼                                           │
         /stazelabs:qa            drive the live app; each defect ───────────┤
                                  becomes a ticket                           │
                                                                             │
    periodic   /stazelabs:hygiene, /stazelabs:continuity   audits ──▶ tickets┘
               /stazelabs:update-docs                      docs reconciled with the code, via PR
    as needed  /stazelabs-go:preview-deploy                ship main to the preview
```

The loop, in order:

1. **Write tickets** of any shape, from a one-line placeholder to a full set of requirements. Audits and QA add their own.
2. **Plan each one** with `/stazelabs:plan`. It explores the codebase, drafts a plan with test-first steps, gets your approval, posts the plan as a comment and sets the ticket's Model label (which model should do the work).
3. **Tidy periodically** with `/stazelabs:hygiene` (engineering health) and `/stazelabs:continuity` (UI, UX and copy standards). They verify every finding and file grouped tickets after your yes. They never fix.
4. **Implement** with `/stazelabs:ticket`: one ticket, an epic, or several in a row. Each goes branch, test-first, gate, final review, PR, merge, close, with every ruling recorded in the PR body. A common pattern is to queue up tickets from the steps above and let this run unattended, for instance overnight.
5. **Verify** with `/stazelabs:qa`. It boots a disposable copy of the web app, drives it through Chrome, traces each defect to a line and files tickets after your yes.
6. **Keep the docs honest** with `/stazelabs:update-docs` on a schedule. It reconciles the documentation with the code and lands the corrections through a PR.
7. **Ship** with `/stazelabs-go:preview-deploy` whenever main is ready, after your explicit yes.

Then back to step 1. The reasoning behind the model (model labels, rulings versus hard stops, why the gate is local) is in [docs/workflow.md](docs/workflow.md).

## What you get

| Command | Plugin | What it does |
|---|---|---|
| `/stazelabs:setup` | `stazelabs` | Detects your tracker MCP, `gh` and superpowers, asks for the project's specifics, writes `.claude/agent-workflow/profile.json`. Re-run to change it. |
| `/stazelabs:plan <id>` | `stazelabs` | Reads a ticket, grounds a plan in the codebase, gets your approval, posts the plan as a comment and sets the ticket's Model label (fable, haiku, sonnet or opus). |
| `/stazelabs:ticket <id>` | `stazelabs` | Resolves a ticket: branch from fresh main, test-first implementation on the labeled model, the project's gate, a final review, PR, merge, close. An epic fans out over its children. |
| `/stazelabs:hygiene` | `stazelabs` | Engineering-health audit of the code (dead code, layering, security, performance, tests). Verifies each finding itself, files grouped tickets after your yes. Never fixes. |
| `/stazelabs:continuity` | `stazelabs` | UI, UX and copy standards audit from source: written-rule deviations and peer-set discontinuities. Files tickets after your yes. |
| `/stazelabs:qa` | `stazelabs` | Boots a disposable copy of the web app, drives it through Chrome, traces each defect to a line, files tickets after your yes. |
| `/stazelabs:update-docs` | `stazelabs` | Reconciles the docs with the code, verifies each correction, and lands it through a PR. |
| `/stazelabs-go:preview-deploy` | `stazelabs-go` | Ships main to the preview by pushing a dated tag that fires a gate-first GitHub Action, after your explicit yes. Fly only in v1. |

`stazelabs-go` also ships a hook that restarts gopls when `.go` files change on disk.

The four audit skills carry the method; what to look for in a given project lives in its **audit packs** at `.claude/agent-workflow/audits/<skill>.md`, which `/stazelabs:setup` scaffolds. Format: [plugins/stazelabs/docs/audit-packs.md](plugins/stazelabs/docs/audit-packs.md). A filled profile and packs from a real project, anonymized, are under [examples/example-app](examples/example-app). `/stazelabs:qa` also needs the Claude in Chrome extension.

The profile's keys are in [plugins/stazelabs/docs/profile.md](plugins/stazelabs/docs/profile.md).

## Prerequisites

- Claude Code with the **superpowers** plugin: `/plugin install superpowers@claude-plugins-official`. The ticket skill uses its brainstorming, planning, test-driven-development and code-review skills and refuses to run without it.
- A **ticketing MCP** connected in your client. v1 speaks Linear. The plugin does not bundle the server; connect it under `/mcp` or your client's connectors.
- **GitHub CLI** authenticated: `gh auth login`.
- For `stazelabs-go`: a project that deploys through a tag-triggered GitHub Action to Fly.

## Install

In Claude Code:

```
/plugin marketplace add stazelabs/agent-workflow
/plugin install stazelabs@agent-workflow
/plugin install stazelabs-go@agent-workflow     # Go projects that deploy to Fly
```

Pick **user** scope to have the skills in every project on this machine (the usual choice), or **project** scope to record them in a repo's `.claude/settings.json` so teammates are told to install them.

Then, in each project:

```
/stazelabs:setup
```

Commit the `.claude/agent-workflow/` folder it writes. The other skills refuse to run until it exists, and each audit skill until its pack does.

## Update

Marketplaces you add yourself don't auto-update unless you turn that on under `/plugin` → Marketplaces. Otherwise:

```
/plugin marketplace update agent-workflow
/plugin update stazelabs
/plugin update stazelabs-go
```

If a skill then says the profile is older than it expects, run `/stazelabs:setup` and it migrates the file.

## Improving it

Edit here, not in `~/.claude/plugins/cache`: that copy is replaced on update. See [docs/contributing.md](docs/contributing.md) for the local dev loop and [docs/migrating-a-project.md](docs/migrating-a-project.md) for moving a project's existing local skills onto the plugin.

## License

MIT; see [LICENSE](LICENSE).
