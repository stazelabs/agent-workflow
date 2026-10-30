# Changelog

## 0.2.0 (2026-10-30)

- `stazelabs`: the audit skills `/stazelabs:hygiene`, `/stazelabs:continuity`, `/stazelabs:qa` and `/stazelabs:update-docs`. The method is in the skill; each project's specifics live in an audit pack at `.claude/agent-workflow/audits/<skill>.md` (format in `docs/audit-packs.md`, templates in `templates/audits/`). Run state at `.claude/agent-workflow/state/<skill>.json`, landed through a chore PR (`docs/landing-state.md`).
- `/stazelabs:setup` offers to scaffold missing audit packs.
- Linear adapter: search-tickets and create-a-ticket verbs.
- Licensed MIT.

## 0.1.0 (2026-10-30)

First cut, extracted from healthcheck.email's local skills.

- `stazelabs`: `/stazelabs:setup`, `/stazelabs:plan`, `/stazelabs:ticket`; Linear adapter; profile schema v1.
- `stazelabs-go`: `/stazelabs-go:preview-deploy` (Fly); gopls refresh hook.
