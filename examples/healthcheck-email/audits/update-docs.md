# Audit pack: update-docs

Read by /stazelabs:update-docs. Headings are fixed; see the agent-workflow plugin's docs/audit-packs.md.

## Standards

[CLAUDE.md](../../../CLAUDE.md) in full. Its "Layout" and "Hard invariants" are the authority: README and ops/ are what the owner runs from, and the help articles are what a customer reads.

## Ground truth

`ls internal/`, the routes in [internal/web/router.go](../../../internal/web/router.go), `ls internal/db/migrations/`, `ls .github/workflows/`, the Make targets (`make` lists them), `ls internal/help/articles/`.

## Surfaces

| Surface | Treatment |
|---|---|
| [README.md](../../../README.md) | In scope: status claims, run commands, links |
| [CLAUDE.md](../../../CLAUDE.md) | In scope, carefully. Correct facts (paths, target names, package lists, what is built). **Never invent, relax or delete a convention** |
| [docs/CONCEPT.md](../../../docs/CONCEPT.md) | In scope: long-range intent; fix factual claims about what is built, leave the intent alone |
| [docs/ADMIN.md](../../../docs/ADMIN.md) | In scope: the admin map, against the `/admin` routes |
| `ops/*.md` (LAUNCH.md, FLY.md, INBOUND-DEV.md) | In scope: verify against `fly.toml`, the Dockerfile, the workflows and the Makefile |
| [docs/superpowers/plans/2026-10-09-hub-arc.md](../../../docs/superpowers/plans/2026-10-09-hub-arc.md) | **Status column only.** Update a row's status (for example "not started" to "merged: PR #N") when `git log` and `gh pr list --state merged` show it. Never edit the other columns |
| `internal/help/articles/*.md` and `internal/help/glossary.json` | In scope (Extra rules) |
| [docs/ENGINE.md](../../../docs/ENGINE.md) | In scope only if the user names it or the engine's rules visibly changed |

## Frozen

- `docs/superpowers/specs/**` and every dated plan under `docs/superpowers/plans/` (except the hub arc's status column).
- Generated files: `internal/web/templates/*_templ.go`, `internal/db/gen/`, `internal/web/icons/icons_gen.go`, `internal/web/static/css/tailwind.css`.

## Partitions

1. **Entry points**: README.md, CLAUDE.md, docs/CONCEPT.md, docs/ADMIN.md.
2. **Ops**: `ops/*.md` against `fly.toml`, `Dockerfile`, `.github/workflows/`, the Makefile and `ops/prod-check.sh`. Hub arc status column.
3. **Help articles and glossary**: the Extra rules verbatim.

## Voice

Sentence case, no exclamation points, "workspace" not "account", "sign in" not "log in", "person" not "team member", "issue" not "case" in app copy. App-facing copy (help articles) never names the model provider.

## Extra rules

Help articles and the glossary are end-user copy, so the bar is higher.

- **Shape.** `internal/help/articles/<slug>.md`: front matter between `---` lines with `title`, `section` (`getting-started` or `basics`), `summary` and `order`, then a Markdown body. The file name is the slug and the URL: **never rename it**. Keep `order` ascending within a section.
- **Every article ends with a `## In healthcheck.email` section** that points into the app (`TestContentIsComplete` fails otherwise).
- Links into help are `/help/<slug>` or `/help/<slug>#<anchor>` and must resolve to an article or glossary term (`TestLinksResolve`). Never link to a slug that does not exist.
- **Glossary** is `internal/help/glossary.json`, a JSON array indented with **one space**, each term with `slug`, `term`, `short` (at most 140 characters, enforced) and `body`. At least 18 terms. `TestEveryFamilyHasATerm` needs a term for every record family. Edit it as JSON, not text: check that `json.dumps(data, indent=1, ensure_ascii=False)` plus a trailing newline round-trips the file before writing, so the diff stays proportional. Assert each replacement matches exactly once.
- **Copy follows CLAUDE.md's Copy rule**; never name the model provider (no "Claude", no "Anthropic"). Plain answer first, detail one step away, and never describe the design to the reader ("a calm layout", "a quiet gap").
- goldmark renders with GFM tables and no Typographer, so a `--` typed as a dash reaches the reader as two hyphens. Write a comma or a period instead; use a real em dash sparingly.
- Check facts the articles state (limits, retention days, cooldowns, check lists) against the code, for example the daily-checks article against the sweep and alerts packages (`TestDailyChecksArticleIsAccurate` pins part of it).
- Run `go test ./internal/help/...` as soon as you touch a file.

## Verify

- **Markdown-only change** (README, CLAUDE.md, CONCEPT, ADMIN, ops, arc table): confirm every relative link you touched resolves, then run `make gen` and check `git status`: Tailwind scans the repo, so a docs edit can legitimately move `internal/web/static/css/tailwind.css`; commit it if it did.
- **Any change under `internal/`** (help articles, glossary): run the full gate (`gate.command`). If `modernize-check` fails, run `make modernize`. No UI template changed, so smoke is not needed.
