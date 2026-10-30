# Contributing

## Where things live

- `plugins/stazelabs`: the core plugin. Skills in `skills/<name>/SKILL.md`, the tracker adapters in `trackers/`, the profile schema in `docs/profile.md`, the shared skill preamble in `docs/preamble.md`, the example profile in `templates/`.
- `plugins/stazelabs-go`: the Go companion. `skills/preview-deploy`, `hooks/hooks.json`.
- `docs/`: the workflow model, this file, the migration guide, the tracker seam.
- `docs/superpowers/specs`: design documents, frozen once merged.
- `examples/`: real profiles from real projects.

## Rules

- A skill never names a project fact. Team, app, gate, paths, label names: all from the profile. If you need a new fact, add the key to `docs/profile.md`, to the setup skill's questions, to the example, and bump the profile `version` if existing skills now require it.
- Every skill starts with the preamble from `docs/preamble.md`, with its required keys listed.
- Tracker calls go through the adapter's verbs. If a skill needs a new verb, add it to every adapter and to `docs/trackers.md`.
- Never edit `~/.claude/plugins/cache/...`. It is replaced on update and your change is lost.

## Dev loop

```
git clone git@github.com:stazelabs/agent-workflow.git
cd agent-workflow
claude plugin marketplace add "$PWD"          # a local-path marketplace, named agent-workflow
claude plugin install stazelabs@agent-workflow
claude plugin install stazelabs-go@agent-workflow
```

Edit, then `make check` (validates the marketplace and both plugins), then `claude plugin marketplace update agent-workflow && claude plugin update stazelabs` to pick up the change, then try the skill in a project that has a profile. When you're done developing, remove the local marketplace and add the GitHub one back so you track main like everyone else.

## Shipping a change

1. Branch, change, `make check`.
2. Try the affected skill once against a real project.
3. Bump `version` in the affected `plugin.json` (patch for wording, minor for a new key or behavior) and add a line to `CHANGELOG.md`.
4. PR, merge with a merge commit. Marketplace entries carry no `version`, so consumers get main on their next update.

## Gotcha: a local marketplace and project-scope installs

Claude Code allows one source per marketplace name. While your user settings point `agent-workflow` at the local checkout, `claude plugin marketplace add stazelabs/agent-workflow --scope project` is refused ("its source doesn't match its extraKnownMarketplaces entry"). Write the project entry by hand instead, so teammates get the GitHub source:

```json
"extraKnownMarketplaces": {
  "agent-workflow": { "source": { "source": "github", "repo": "stazelabs/agent-workflow" } }
}
```

`claude plugin install stazelabs@agent-workflow --scope project` works as usual and records `enabledPlugins`.
