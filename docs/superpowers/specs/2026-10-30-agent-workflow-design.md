# agent-workflow design

Date: 2026-10-30. Status: approved by the owner.

## Intent

healthcheck-email grew a working Claude Code workflow: a Linear ticket is planned and model-tagged (`/plan`), built test-first through a gate, reviewed, merged with a merge commit and closed (`/ticket`), then shipped by a tag-triggered, gate-first deploy (`/preview-deploy`). Those skills live in one repo and name that repo's team, app, gate and layout. This project moves the workflow into an installable, centrally maintained plugin so any Stazelabs project (and later anyone) gets it in one step, configures its own specifics at first run, and picks up improvements with a plugin update.

## Goals

- Install in one step from a private GitHub repo; update in one step.
- Per-project specifics (tracker team and labels, gate, branch and merge style, deploy target) configured once per project by `/stazelabs:setup` and committed, never baked into a skill.
- One set of skills on a machine serves many projects with different profiles.
- Documentation good enough that a new person understands the workflow model in ten minutes.
- Close hold: private repo, collaborator access only, until the owner opens it.

## Non-goals (v1)

- The audit skills (hygiene, continuity, qa, update-docs) and their state files. They stay in healthcheck until v2.
- A second tracker adapter. Linear ships; the seam for others is documented.
- Bundling the Linear MCP or superpowers. Both are prerequisites the setup skill checks.
- Shipping `.claude/rules`. Plugins cannot carry rules; they stay in each project.

## Anti-goals

- A skill that silently assumes a project fact (team, app name, gate) instead of reading the profile.
- Editing the installed plugin cache to customize; customization is the profile, improvements are PRs.
- A deploy path that bypasses the gate.

## Constraints

- Claude Code plugin mechanics: skills namespaced by plugin name; `${CLAUDE_PLUGIN_ROOT}` is per plugin and replaced on update; `${CLAUDE_PROJECT_DIR}` is the project; no per-project plugin config exists, so the skill reads the profile file itself.
- Private marketplace auth is the machine's git credentials (SSH key in the agent, or `gh auth setup-git`).
- MCP tool prefixes differ per machine (`mcp__linear-server__` here); the adapter stores suffixes and the skill finds the prefix at run time.

## Design

### Repo layout

```
agent-workflow/
├── .claude-plugin/marketplace.json        # name "agent-workflow", owner Stazelabs, two plugin entries (source ./plugins/<name>, no version field so installs track main)
├── README.md                              # what it is, install, first run, update, close-hold note
├── CHANGELOG.md
├── LICENSE                                # owner's choice; placeholder until public
├── docs/
│   ├── workflow.md                        # the model: ticket → /stazelabs:plan (model label) → /stazelabs:ticket (branch, TDD, gate, review, PR, merge-commit, close) → /stazelabs-go:preview-deploy (tag → gate-first action); rulings vs hard stops; one ticket per PR; never trigger CI
│   ├── profile.md                         # the profile schema, every key, which skill reads it
│   ├── trackers.md                        # the adapter seam: verbs each skill needs and how an adapter file maps them
│   ├── contributing.md                    # dev loop (marketplace add from local path), `claude plugin validate`, never edit the installed cache, PR back, how a profile `version` bump is handled
│   └── migrating-a-project.md             # moving existing local skills to the plugin (the healthcheck steps, generalized)
├── plugins/
│   ├── stazelabs/
│   │   ├── .claude-plugin/plugin.json     # name stazelabs, version 0.1.0
│   │   ├── skills/
│   │   │   ├── setup/SKILL.md
│   │   │   ├── ticket/SKILL.md
│   │   │   └── plan/SKILL.md
│   │   ├── trackers/linear.md             # verb → Linear tool-name suffix mapping (prefix found at run time), label-merge rule, state names, epic enumeration
│   │   ├── templates/profile.example.json # a filled example (healthcheck's values, anonymized where sensitive)
│   │   └── docs/preamble.md               # the shared §0 text every skill copies: read the profile, check version and the keys this skill needs, stop with "run /stazelabs:setup" if any is missing
│   └── stazelabs-go/
│       ├── .claude-plugin/plugin.json     # name stazelabs-go, version 0.1.0
│       ├── skills/preview-deploy/SKILL.md
│       └── hooks/hooks.json               # the gopls restart PostToolUse hook from healthcheck's settings.json, using ${CLAUDE_PROJECT_DIR}
└── examples/healthcheck-email/            # the real profile healthcheck commits, as the worked example
```

### Profile and state (per project)

Path: `.claude/agent-workflow/profile.json` (committed). State: `.claude/agent-workflow/state/<skill>.json` (committed or gitignored per `profile.state.committed`; `/stazelabs:setup` writes the `.gitignore` line when false).

Profile keys (v1; `docs/profile.md` is the authority once written):

```json
{
  "version": 1,  // no MCP prefix key: the adapter lists tool suffixes and each skill finds the live prefix with ToolSearch at run time
  "project": { "name": "healthcheck.email", "authority": ["CLAUDE.md", "docs/superpowers/specs"] },
  "tracker": {
    "kind": "linear",
    "team": "healthcheck-email",
    "prefix": "EMAIL",
    "states": { "started": "In Progress", "done": "Done" },
    "modelLabels": { "fable": "fable", "haiku": "haiku", "sonnet": "sonnet", "opus": "opus" }
  },
  "repo": {
    "mainBranch": "main",
    "branchPattern": "{prefix_lower}-{number}-{slug}",
    "commitFormat": "{Area}: {summary} ({id})",
    "mergeStyle": "merge",
    "deleteBranchOnMerge": true,
    "neverTriggerCI": true
  },
  "gate": {
    "command": "make gen && make fmt && make vet && make lint && make test && make cover-check",
    "notes": ["make lint failing on modernize-check: run make modernize and rerun", "make gen rewrites generated files: commit them"],
    "smoke": { "command": "RESEND_API_KEY= make smoke", "paths": ["internal/web/templates/", "internal/web/static/", "e2e/"] }
  },
  "review": {
    "model": "opus",
    "skipUnderLines": 50,
    "alwaysReviewPaths": ["internal/web/handlers", "internal/web/router.go", "internal/db", "internal/engine", "internal/jobs", "internal/auth", "internal/netguard", "internal/smtpprobe", "*.sql"]
  },
  "hardStops": ["any Fly, DNS or Resend action", "anything destructive", "changing a recorded product decision in CLAUDE.md or an approved spec"],
  "deploy": {
    "provider": "fly",
    "app": "healthcheck-email-preview",
    "url": "https://preview.healthcheck.email",
    "healthz": "/healthz",
    "tagPrefix": "preview-",
    "workflow": "deploy-preview.yml",
    "ciWorkflow": "ci.yml",
    "runbooks": ["ops/FLY.md", "ops/LAUNCH.md"],
    "preDeployCheck": "SMOKE_DOMAIN=stazelabs.com make prod-check"
  },
  "state": { "committed": true }
}
```

Every skill opens with the same preamble (§0), copied from `docs/preamble.md` with that skill's required-keys list filled in: Read `.claude/agent-workflow/profile.json`; if the file is missing, `version` is older than the skill expects, or a required key is absent, say "this project isn't set up for /stazelabs:ticket yet: run /stazelabs:setup" and stop. No helper script (my call: a script in one plugin isn't reachable from the other, and Claude reads JSON fine). The ticket skill also confirms the superpowers plugin is present (its skills appear in the skill list) and stops if not. Project facts never appear in a skill body; they come from the profile or from the project's own CLAUDE.md, which Claude Code loads anyway.

### Skill behavior changes when porting

- **setup**: detect (tracker MCP tools present via ToolSearch; `gh auth status`; `fly`/`flyctl` if deploy requested; superpowers plugin installed, since ticket invokes brainstorming/writing-plans/executing-plans/test-driven-development/requesting-code-review). Ask (team picked from `list_teams`; prefix read from the team; label names, offer to create missing Model labels via `save_issue_label`; gate command, suggesting `make` targets or `go test ./...` / `npm test` from what the repo has; branch/commit/merge style; review paths; hard stops; deploy section if the owner says the project deploys through a tag-triggered action (asked, not detected: installed plugins are not reliably discoverable from a skill); state committed?). Write profile, create state dir, add gitignore line if needed, print a summary. Re-run shows the current profile and edits by section. Never writes to the tracker except label creation after a yes.
- **ticket**: §0 preamble replaces the Linear tool load with "read `${CLAUDE_PLUGIN_ROOT}/trackers/<kind>.md` and load the tools it names". §1 states and label names from the profile. §1b model table unchanged but label names via `tracker.modelLabels`. §2 branch from `repo.branchPattern`. §4 drops the healthcheck invariant list: "the files in `project.authority` are the authority". §5 gate and smoke from `gate`. §6 threshold from `review`. §7 commit format from `repo.commitFormat`; the co-author trailer comes from the harness, the skill says "end with the attribution the session specifies". §8 merge style from `repo`. Hard stops from `hardStops` plus the two universal ones (destructive actions, recorded decisions).
- **plan**: same preamble; label group from `tracker.modelLabels`; "follow this project's plan style" points at `project.authority` and any `docs/superpowers/plans` if present; the reuse list of healthcheck helpers is removed (Explore finds them); verification section quotes `gate.command` and `gate.smoke`.
- **preview-deploy**: all Fly names, URLs, workflow files and runbook paths from `deploy`; the §6 wiped-volume recovery becomes a generic "after a wiped volume, see runbooks" with the Fly commands kept because the provider is fly; the hard gate ("owner says yes, every time") stays verbatim.
- Model label semantics stay: fable = spec work, haiku/sonnet/opus = implementation tiers. Documented in `docs/workflow.md`.

### Dev and release loop

- Develop with the marketplace added from the local path: `/plugin marketplace add /Users/cstaszak/Stazelabs/projects/agent-workflow`, install from it, iterate, `/plugin update`. Consumers add `stazelabs/agent-workflow`.
- `claude plugin validate plugins/stazelabs` and `plugins/stazelabs-go` before every commit (also a `make check` target in the repo).
- Profile `version` is an integer; a key addition that skills require bumps it, the preamble reports the gap, `/stazelabs:setup` migrates.

## Left to the builder

Exact wording of the skills, the preamble and the docs; the `claude plugin validate` and `make check` wiring; the LICENSE text until the repo goes public; the shape of the state directory beyond its path (no v1 skill writes state).
