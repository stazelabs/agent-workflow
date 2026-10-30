# Audit pack: qa

Read by /stazelabs:qa. Headings are fixed; see the agent-workflow plugin's docs/audit-packs.md.

## Standards

Read [CLAUDE.md](../../../CLAUDE.md), "Hard invariants" especially. Also read the continuity pack's Known non-findings ([continuity.md](continuity.md)); they apply here too.

## Never targets

- The owner's dev server (`make dev`, port 8080) and its database `data/healthcheck.db`. If a command's output names `data/healthcheck.db` or port 8080, stop.
- The ngrok tunnel (`make tunnel`).
- preview.healthcheck.email and anything on Fly.
- The dev `.env.local`, which holds a real Resend key.

## Boot

The scratch server is the same one `make smoke` boots ([e2e/run.sh](../../../e2e/run.sh)): a temp database, email off, the model off, and scans reading the fake zone [e2e/smoke.zone](../../../e2e/smoke.zone), so no real network and no real mail. Every setting is given explicitly because godotenv never overrides a variable that's already set, even to empty, and an unset one would fall through to `.env.local`.

Pick a free port (not 8080; 8095 is the smoke default) and boot it in the background, recording the PID:

```bash
cd "$CLAUDE_PROJECT_DIR"
port=8097; while curl -fsS -o /dev/null http://localhost:$port/healthz 2>/dev/null; do port=$((port+1)); done
dir="$PWD/tmp/qa"; rm -rf "$dir"; mkdir -p "$dir"
go build -o bin/healthcheck ./cmd/healthcheck
export HC_ENV=dev HC_ADDR=":$port" HC_APP_BASE_URL="http://localhost:$port" HC_DB_PATH="$dir/qa.db" \
  HC_FAKE_ZONE="$PWD/e2e/smoke.zone" HC_INVITE_ONLY= HC_LOG_FORMAT=text HC_LOG_LEVEL= \
  HC_SESSION_SECRET= HC_MAGIC_LINK_HMAC_SECRET= HC_COOKIE_SECURE= HC_CLIENT_IP_HEADER= \
  HC_RESOLVER_ADDR= HC_LLM_PRICES= EMAIL_FROM_ADDRESS= RESEND_API_KEY= ANTHROPIC_API_KEY=
(cd "$dir" && exec "$OLDPWD/bin/healthcheck" serve) >"$dir/serve.log" 2>&1 &
echo "port=$port pid=$!"
```

- **Health:** `curl -s -o /dev/null -w '%{http_code}' http://localhost:$port/healthz` returns 200 (`GET /healthz` in `router.go`).
- **Log:** `tmp/qa/serve.log`, logfmt text.
- **Sign in:** under the scratch environment, `make signin-link email=qa-owner@example.com` (it runs `go run ./cmd/healthcheck admin signin-link`; `./bin/healthcheck admin signin-link qa-owner@example.com` is equivalent). Open the printed link in a new tab and press Sign in. There is no mail sink, which is why the link comes from the CLI.
- **Superadmin for the admin slice:** `make set-superadmin email=qa-owner@example.com` under the same environment. Never run it without the scratch `HC_DB_PATH` exported: without it the command would hit `data/healthcheck.db`.

## Areas

Routes are all in [router.go](../../../internal/web/router.go); `{slug}` is the workspace slug the sign-in lands in.

Flow slices:

| Slice | Flow | Walk |
|---|---|---|
| A | Sign in and workspace | `/signin` (request, then the CLI link, `POST /signin/verify`), sign out, `/workspaces`, create a `QA-` workspace, switch between workspaces, an invite-only visitor's `/request-invite` form on `/` |
| B | Add a domain and read the report | `/w/{slug}/domains`, "Add and check" with `example.com` (the fake zone makes it pass every check), the in-place polling, the verdict (`#verdict`) and its three questions, "Everything we checked", re-scan and its cooldown, verify, DMARC plan, report.md download, compare, history scan pages |
| C | Services | Domain tab Services (`/domains/{id}/services`): add a service, remove, restore, sender review, subdomain review, site addresses (`/site/...`), the sends-email toggle (admin) |
| D | DNS tab | `/domains/{id}/dns`: registrar and DNS host with the brand marks, the records and their plain-English reading, quirks (`/help/quirks`), the quirk signal control |
| E | Inbox and message page | `/domains/{id}/inbox`: the "Inbound mail isn't set up yet" state, Settings "Create an intake address", save a pasted message (`POST /inbox/save`), open `/inbox/{msgID}`, add it to a case, delete it (admin), the unread count on the tab. Real inbound mail needs the webhook and the tunnel, so it is out of bounds here |
| F | Cases | `/w/{slug}/cases/new` ("Get help" on home): answer, "Check it", the case page (What we checked, Examples, Timeline), add an example's headers, add a note, set the state (open, in progress, resolved), the Resolved list |
| G | Weekly digest settings | The Weekly digest section on `/account` (one `SwitchRow` per workspace, `POST /me/digest`), the home prompt (`/w/{slug}/digest/on` and `/digest/dismiss`), time zone (`/me/timezone`), `/digest/unsubscribe` page; see Limits |
| H | Account switches | `/account`: display name, avatar upload and remove (`/me/avatar`), Alert emails, Case emails, How much detail (`/me/detail`), each switch persisting across reload and showing a toast |
| I | Members and roles | `/w/{slug}/members`, invite a fake address (the flash shows the invite link because email is off), accept it as the second person (Pass S), change a role, revoke an invitation, leave, workspace settings (`/settings`, avatar, archive) |
| J | Share links | Domain Settings: create a share link (admin), open `/r/{token}` signed out (a fresh tab with no cookies cannot be had in one Chrome profile, so use a private window if the user supplies one, else sign out first), `/r/{token}/report.md`, the read-only page has no controls or feedback, `X-Robots-Tag: noindex`, revoke and re-open (expect a graceful page), calendar feed (`/cal/{token}`) |
| K | Header analyzer | `/w/{slug}/headers`: paste the sample headers from [e2e/smoke.spec.js](../../../e2e/smoke.spec.js), "Check headers", "What we found", Hops; an empty paste, an oversized paste, garbage; the per-hour paste limit message |
| L | Admin pages | `/admin` (Overview), access, users, workspaces, domains and a domain detail, feedback, questions, jobs, inbound, configuration, quirks, smart-features. Viewing is fine; see Limits |
| M | Install and offline | `/offline` (carries no person or toast), `/manifest.webmanifest`, `/sw.js`, the home-screen hint (`#hc-install`, hidden unless a phone; needs a phone user agent, so drive it with the smoke test's approach or a narrow window and the user's say-so), Not now sticking |

Cross-cutting passes N to T are the skill's. App specifics:

- **N**: visit every reachable workspace page, domain tab, case page and admin page.
- **O**: the app has **no theme toggle**; [input.css](../../../internal/web/static/css/input.css) switches its tokens on `@media (prefers-color-scheme: dark)`. Hunt the `note`, `warn` and `danger` tones losing contrast too.
- **P**: the domain tab bar swaps to short labels below `sm`, the header wraps its nav, and tables scroll in their own wrapper. Pages worth the probe: home, domains, a domain's six tabs, `/cases/new` and a case, `/headers` and a result, `/members`, `/account`, `/r/{token}`, `/signin`, `/offline`, and `/admin` tables.
- **Q**: tab through the domain tab bar, the switches, forms and the sign-out control.
- **R**: bad domain, an email without a domain, a very long note; success is a toast; a missing entity (a stale domain id) redirects with a flash, never a 404.
- Async: a new domain's report arrives in place by polling (the smoke test allows 75 seconds). The fake zone makes it fast; a report that never appears, or a page that reloads to show it, is a finding (`window.hcNoReload` stays true).

### Pass S: role gating with real second accounts

This app has **no assume-role**. The roles are viewer, member, admin and owner; the route groups are in `router.go`. Setup, on the scratch server only:

1. As the owner (`qa-owner@example.com`), open `/w/{slug}/members` and invite `qa-viewer@example.com` as a viewer. With email off the flash shows the invitation link instead (nothing is sent). Copy it from the page text.
2. Sign out. Mint a link for the second person (`make signin-link email=qa-viewer@example.com`), sign in, then open the invitation link and accept it.
3. Walk the workspace as the viewer. Layer 1 (UI): no "Add and check", no re-scan, verify, flows or quirk controls, no members controls, no Settings nav item, no share, archive or inbox-delete controls. Viewers can still read, give feedback, ask, open a case and use the header analyzer (`RoleViewer` group). Layer 2 (route): paste a gated URL by hand (`/w/{slug}/settings`, an admin page) and expect a redirect with a flash, never a 500 and never the page.
4. Repeat for member and admin by changing the person's role on `/members` as the owner (sign in again as the owner each time). Confirm each boundary against the route groups in `router.go`: member can add domains and flows, admin can invite, share, archive and delete inbox messages, only the owner can archive the workspace.
5. A non-superadmin must not reach `/admin` (expect a redirect or denial, not a page).

## Limits

- **Never send real email.** The server runs with `RESEND_API_KEY` blank, so the mailer is a no-op and the app says so. Never restart the server with a Resend key. Weekly digest: exercise the settings and the unsubscribe page only; never trigger a real send.
- **No live model calls.** `ANTHROPIC_API_KEY` is blank, so Ask and the summary degrade gracefully; verify that graceful state, not output quality. Never put a key in.
- **No outbound network from scans.** The fake zone answers; a scan of any domain not in `e2e/smoke.zone` is read as unchecked. Don't point the server at live DNS.
- **Admin destructive tools**: viewing admin pages is fine; locking users, archiving workspaces and retrying or stopping jobs are allowed only on `QA-` data you created on the scratch server.

## Triage

- Environment noise: a scan answered "unchecked" for a domain outside the fake zone.
- Scratch data: `sqlite3 tmp/qa/qa.db`.
- Service worker: pages always come from the network and are never cached; only static files and `/offline` are precached.
- Log greps. The log is logfmt text, not JSON, so grep for `status=500`, never `"status":500`. A healthy run shows a large `status=200` count:

```
tail -n +<mark> tmp/qa/serve.log > tmp/qa/run.log
grep -oE 'status=[0-9]+' tmp/qa/run.log | sort | uniq -c       # prove the pattern fires first
grep -cE 'status=5[0-9]{2}' tmp/qa/run.log                      # 5xx
grep -oE 'status=4[0-9]{2}' tmp/qa/run.log | sort | uniq -c     # 4xx, by code
grep -cE 'level=ERROR|panic' tmp/qa/run.log                     # panics and ERROR records
```

## Code map

The handler (via [router.go](../../../internal/web/router.go) and `internal/web/handlers/`), the `.templ` source in `internal/web/templates/` (never `*_templ.go`), the JS in `internal/web/static/js/app.js`. Name the CLAUDE.md "Hard invariants" rule a defect breaks.

## Cleanup

Remove `tmp/qa/`. The database was disposable, so there are no records to trash.

## Known non-findings

- **The continuity pack's Known non-findings apply here too** (share pages without controls, the offline page without a person, admin pages naming the model provider).
- **A scan reporting "unchecked"** for blocklists, SMTP probes or RDAP when the domain isn't in the fake zone: "a failed or refused answer is never read either way" is the design.
- **Ask and summaries degrading with no model key**: expected on the scratch server.
- **The invite flash showing the link instead of "sent"**: email is off by design here.
- **No dark-mode toggle**: the theme follows the OS.
- **The install hint staying hidden on a desktop viewport**: it shows only on a phone, not already installed, not dismissed.
- **`AbortError: Transition was skipped` in `read_console_messages`**: a tool artifact that appears after a POST-then-redirect. Do not file it without a user-visible symptom.
- **An iframe at 393 px with a null `contentDocument`**: the app sends anti-framing headers; correct security behavior.
- **Slow first scan after boot**: warmup on a fresh server is not a performance finding. Only repeatable slowness on a warm server counts.
