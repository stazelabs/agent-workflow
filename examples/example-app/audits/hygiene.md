# Audit pack: hygiene

Read by /stazelabs:hygiene. Headings are fixed; see the agent-workflow plugin's docs/audit-packs.md.

## Standards

Read [CLAUDE.md](../../../CLAUDE.md) in full, especially "Layout", "Hard invariants" and "Rejected", and the scoped rules in `.claude/rules/` (database, handlers, security). Also read the design and the engine doc when a dimension needs them: [docs/superpowers/specs/2026-10-08-mvp-design.md](../../../docs/superpowers/specs/2026-10-08-mvp-design.md) and [docs/ENGINE.md](../../../docs/ENGINE.md). Quote a dimension's rules from CLAUDE.md's "Hard invariants" for most dimensions.

## Pre-pass

The gate already runs `go vet`, `staticcheck` and the modernize check. Run first:

```
go build ./... 2>&1 | head
make vet
make lint              # modernize-check plus staticcheck, pinned to LINT_TOOLCHAIN (go1.27.1)
make cover-check       # package coverage floors in coverage-floors.txt
```

Optional, manual, not part of the gate: `go run golang.org/x/vuln/cmd/govulncheck@latest ./...` for dependency CVEs. Run it for the security dimension; a real hit is a finding. Do not add it to the Makefile or a workflow. Keep the `@latest` (the module is not in go.mod, so the bare path fails), and never run it with `GOFLAGS=-mod=mod` or `go get` it: either rewrites go.mod and go.sum. Check `git status` is clean afterwards.

## Dimensions

| # | Dimension | What it hunts |
|---|---|---|
| 1 | **Dead code and unused surface** | Unreferenced exported funcs and types, unused templ components, orphaned blocks in `internal/db/queries/*.sql` and unused `gen` methods, dead JS in `internal/web/static/js/app.js`, unused entries in `internal/web/icons/icons.json` and the catalog JSON files, env vars read nowhere, commented-out blocks, stale TODOs, Make targets nothing uses |
| 2 | **Duplication and near-duplication** | Hand-rolled helpers where the standard library or an existing package serves (`slices`, `maps`, `internal/textnorm`, `internal/timefmt`, `internal/idgen`), copy-pasted handler skeletons, near-identical templ blocks, repeated badge or input markup that should be `templates.BadgeView`, `templates.TextInput` or `templates.SwitchRow`, duplicated SQL, engine rules that restate each other |
| 3 | **Architecture and layering** | Routes not mounted in `internal/web/router.go`; domain logic living in handlers that belongs in its own flat `internal/` package ("no service or store layer: handlers call sqlc directly; pure logic lives in domain packages"); pure packages (`comingup`, `diff`, `export`, `headers`, `sitescan`, `avatar`) touching the database or network; **the engine purity rule**: `internal/engine` reaching for the network, the database or the clock instead of `engine.Deps`; budgets living in callers instead of inside observe; `RequireRole` missing from a route or `roleAtLeast` from its template; and **should-be-a-job**: outbound network work inside a mutating request that is not on the CLAUDE.md exception list (magic links, invitations, invite-request notices, Ask, the header analyzer's DKIM lookups). That belongs behind `jobs.Enqueue` in the request's transaction |
| 4 | **Database and query correctness** | Writes through `Deps.R` (query_only, fails loudly); `Deps.Q` used inside a transaction instead of `gen.New(tx)` (the writer pool has one connection: deadlock); instants formatted outside `internal/timefmt` (raw `time.RFC3339`); IDs minted outside `idgen.New()`; N+1 loops; missing indexes on hot filters; ad-hoc `db.Query` in handlers instead of sqlc; an applied migration edited; migrations authored carelessly (append-only, `internal/db/migrations`); a queued job written outside the transaction that caused it |
| 5 | **Security** | Mutations missing `middleware.RequireRole` or the template's `roleAtLeast`; queries not scoped to the workspace (IDOR across workspaces); unauthenticated routes that should not be; **outbound HTTP or SMTP to a host named by user data that bypasses `internal/netguard`** (address rule in `internal/netaddr`); `internal/smtpprobe` speaking more than EHLO, STARTTLS and QUIT; share links (`/r/{token}`) storing a raw token or missing `middleware.RateLimit` or `X-Robots-Tag`; inbound webhook and upload handling (size caps, safe parsing, limited decompression; `internal/avatar` re-encoding, originals never stored or served); secrets, pasted headers or message bodies in logs or the database; magic-link and sign-in enumeration; **CSP**: inline scripts, `style=` attributes or inline event handlers anywhere (JS lives in `internal/web/static/js/app.js`); `templ.URL` on user-controlled values; the optional govulncheck hits |
| 6 | **Performance and resource use** | N+1 queries; hot read paths on `Deps.Q` instead of `Deps.R`; unbounded fan-out; outbound calls without a deadline or `io.LimitReader` (first ask whether the call belongs in a request at all, dimension 3: a deadline on a fetch that should be a job bounds the symptom, not the cause); `defer` in loops; goroutine leaks; unbounded result sets; the sweep ticker queueing more than its 4-at-once cap |
| 7 | **Error handling and observability** | Ignored errors; wrapping style (`fmt.Errorf("doing thing: %w", err)`, lowercase verb-led, no trailing period); `slog.Default()` in handler bodies; 5xx paths with no logged context; **a transient lookup failure (`OutcomeError`, `FetchError`) read as a missing record** (rules about an absence must check the family's `Known` flag); a refused or failed blocklist answer read as listed or not listed; panics reachable from a request; a failed lookup that unverifies a domain |
| 8 | **Test coverage and quality** | Packages and handlers with no test; bespoke `db.Open` plus `db.Migrate` where `internal/db/dbtest` (`dbtest.New(t)`) belongs; tests that call the live model API instead of `llmtest.Fake`; golden snapshots re-recorded without an engine change; untested recently changed critical paths; `make cover` low spots against `coverage-floors.txt`; tests asserting nothing |

The invariants that cut across dimensions (engine confidence levels, drift alerts only from live scans, `Evaluate` as a pure function whose `CatalogVersion` or `engine.Version` bumps when output changes, status labels only through `BadgeView`, colors only as ink/paper/accent/danger/warn/note tokens, copy never naming the model provider) belong to whichever dimension the hazard is closest to. Check them when the run touches that area.

## Search surface

`cmd/`, `internal/`, `internal/db/queries/*.sql`, `internal/web/static/js/app.js`. Skip the generated files listed under Known non-findings. Agents never run a live scan or a live model call; tests use `llmtest.Fake`.

## Known non-findings

- **Generated files are committed on purpose**: `internal/db/gen/`, `internal/web/templates/*_templ.go`, `internal/web/icons/icons_gen.go`, `internal/web/static/css/tailwind.css`. Never flag them as duplication, dead code or bloat, never cite them as evidence, never propose editing them. The `.templ`, `.sql` and `icons.json` sources are the truth.
- **The "Rejected" list stands**: mattn/go-sqlite3, ORMs, gin/echo/fiber, React/Vite, Docker as a runtime requirement, passwords, OAuth (for now), Redis, struct-tag validation libraries. Do not propose any of them as a fix. Hand-rolled form parsing is the chosen shape.
- **One Go binary and one SQLite file, deployed to Fly as an invite-only preview.** The single-connection writer pool is the design, not a bottleneck to fix with more writers; the reader pool (`Deps.R`) is the lever.
- **Migrations are append-only**: never propose editing an applied migration.
- **CI is manual-dispatch only** (`ci.yml`), and the one push trigger is the `preview-*` tag deploy (`deploy-preview.yml`), which re-runs the gate. Never propose branch push or pull_request triggers.
- **Sanctioned inline outbound work**: every exception CLAUDE.md's "Outbound network work" invariant lists (transactional email, Ask, the header analyzer, the record checker, Check this record now, mailbox setup records, admin configuration tests and email test sends, avatar blob puts). Not "network in a mutating request".
- **The engine's own budgets** (60 s deadline, SPF lookup limit, host caps) live inside observe by design.
- **Display-only model output**: `internal/senderid` suggestions never reach the engine, and `internal/narrative` text is not evidence. Not a purity violation.
- **Alerting is a no-op while email is not configured**, and smart features fail open on a load failure (`internal/smartfeatures`). Both are intentional.
- **Replays never alert or extend a streak**, and a domain's first live scan alerts nothing: the baseline rule, not a missed alert.
- **Hand-rolled create and update flows** that carry irreducible domain logic are a documented choice, as is flat package layout with no service layer.
- **Copy rules apply to app copy only**: superadmin pages may name the model provider.

## Verification notes

- **Dead code:** grep templ call sites, generated `_templ.go`, `router.go` mounts, string references in `app.js`, `icons.json` slugs, catalog JSON keys, reflection, and test-only use.
- **Security and correctness:** trace the actual route in `internal/web/router.go`: is the middleware really absent, or is it on the parent group? Confirm the query really lacks the workspace scope.
- **Database:** confirm a `Deps.Q` call is really inside a transaction scope, and that a write really goes through `Deps.R`.
