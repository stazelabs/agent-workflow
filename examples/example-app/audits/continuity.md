# Audit pack: continuity

Read by /stazelabs:continuity. Headings are fixed; see the agent-workflow plugin's docs/audit-packs.md.

## Standards

Read [CLAUDE.md](../../../CLAUDE.md) in full; its "Hard invariants" and "Layout" sections, with the scoped rules in `.claude/rules/` (copy-voice, ui-theming, handlers, security), are the specification. Read `internal/web/templates/badge.go` and the shared component definitions in `internal/web/templates/components.templ` too. Component definitions also live in `switch.templ`, `layout.templ`, `avatar.templ`, `dialog.templ` and `combobox.templ` under `internal/web/templates/`. The design principle: plain answer first, detail one step away.

## Dimensions

| # | Kind | Dimension | Checks against |
|---|---|---|---|
| 1 | deviation | **Theming and tokens** | "Colors are ink/paper/accent/danger/warn/note tokens with opacity modifiers. Never bg-white, never raw hues." Note is "expected for your setup". Avatar colors are the six token pairs in `templates/avatar.go`; warn and danger never decorate. Marks in `internal/web/icons` render in currentColor only |
| 2 | deviation | **Copy and voice** | "Copy": sentence case, no exclamation points, "workspace" not "account", "sign in" not "log in", "person" not "team member"; app copy never names the model provider (no "Claude" or "Anthropic", privacy page included); success is a toast; a missing entity redirects with a flash, never a 404. Plain answer first, detail one step away (the design principle) |
| 3 | deviation | **Accessibility and interaction** | Focus visible on every control, keyboard operability of menus and switches, `aria-*` on custom controls, `aria-current="page"` on the active tab, alt text, labels tied to inputs, no native `confirm()` or `alert()`, CSP: no inline script or style attributes (JS lives in `internal/web/static/js/app.js`) |
| 4 | deviation | **Role gating** | "Roles are gated twice: middleware.RequireRole on the route and roleAtLeast in the template." Viewers never see edit affordances; the route groups in `internal/web/router.go` (viewer, member, admin, owner) match the template guards |
| 5 | discontinuity | **Partial adoption of shared components** | Methods, 5 |
| 6 | deviation | **Narrow viewport (320 to 520 px)** | Source-level only: rows that pair text with several controls and don't stack, the domain tab bar's short labels, tables without their own scroll container, text inputs under 16px (a suspicion only; no written rule). Methods, 6 |
| 7 | discontinuity | **Peer check across surfaces** | Methods, 7 |

## Methods

### 5. Partial adoption of shared components

Count call sites both ways for each:

- `BadgeView` (with a `Badge` from `badge.go`) vs hand-written status pills: any span that shows a status word, severity, level, confidence, effort, flow or job state and isn't a `BadgeView`.
- `TextInput` vs raw `<input type="text|email|url|...">` and `<textarea>`; check that value-as-stored fields (domain, slug) set `Literal: true`.
- `SwitchRow` vs hand-rolled on/off checkboxes or buttons (account switches, weekly digest, domain settings).
- `EmptyState` vs bare "No X yet." paragraphs.
- `PageHeader` vs hand-rolled `<h1>` blocks on workspace pages.
- `CenteredCard` vs ad hoc centered panels on sign-in, invite, unsubscribe and error pages.
- `DomainAvatar` (and the person and workspace avatars in `avatar.templ`) vs raw initials or letter tiles.
- `Select` vs a raw `<select` outside `components.templ`. `TestNoAdHocSelect` enforces it; the grep `grep -rnE "<select[[:space:]>]" internal/web/templates/*.templ` should match only `components.templ`. Any other hit is a finding.
- `Combobox` vs a plain `Select` on a long list (about 8 or more options) or on choices that carry more than a name (an icon, a second line). Under about 8 plain options, `Select` is correct; don't file those. Long lists on plain `Select` are the finding, with the list and the option counts.
- `FormDialog` vs a raw `<dialog`. `TestEveryDialogIsFormDialog` enforces it; the Combobox's phone bottom sheet is the one exception (app.js creates it).
- `AddButton` / `AddLink` vs a hand-rolled header action: a button or link in a row beside `PageHeader` instead of in its children. Any add action on a list page that isn't in `PageHeader`'s children is a finding.
- Badge tone and the `note` token: "expected for your setup" uses `note`, not `warn`.

### 6. Narrow viewport

Find rows that pair text with a multi-control action group and lack a stacking class:

```
grep -rn 'flex items-center justify-between' internal/web/templates/*.templ
```

For each hit, answer three questions in order:

1. **Does the row have an action group?** A sibling `flex shrink-0 items-center gap-...`. None means not a finding.
2. **Does the group hold two or more controls** (button, link, switch, menu)? One control is fine unstacked; it leaves the label room.
3. **Is it already stacked?** `flex-col ... sm:flex-row` present means compliant.

A finding is a row failing (3) while passing (1) and (2). Report the file:line, the control count, and the label. Also check: the domain tab bar (`domainTabBar` in `domain_tabs.templ`) keeps its short phone labels (`tabLabel`); tables sit in their own `overflow-x-auto` wrapper; the sticky header in `layout.templ` doesn't wrap into content.

### 7. Peer check across surfaces

Read the template and its handler for each surface. The peer groups, all confirmed in `internal/web/router.go`:

| Group | Surfaces |
|---|---|
| Domain tabs (`/w/{slug}/domains/{id}` and below) | Overview, Services (`/services`), Inbox (`/inbox`, plus `/inbox/{msgID}`), DNS (`/dns`), History (`/history`), Settings (`/settings`); also `/scans/{scanID}`, `/compare`, `/questions` |
| Workspace pages (`/w/{slug}/...`) | Home (`/`), Domains (`/domains`), Cases (`/cases`, `/cases/new`, `/cases/{caseID}`), Members (`/members`), Settings (`/settings`, admin only), Headers analyzer (`/headers`) |
| Account | `/account`, `/workspaces` |
| Admin (`/admin/...`) | overview, access, users, workspaces, domains, feedback, questions, jobs, inbound, configuration, quirks, smart-features |
| Public | share pages (`/r/{token}`), sign-in, invite accept, unsubscribe pages, `/help`, `/terms`, `/privacy`, `/offline` |

Read-only treatment: share pages carry no feedback or controls by design. Missing entities redirect with a flash, never a 404.

## Search surface

`internal/web/templates/*.templ` (never `*_templ.go`, which is generated), `internal/web/templates/*.go` helpers, `internal/web/handlers/`, `internal/web/static/js/app.js`, `internal/web/static/css/input.css`, `internal/web/router.go`.

## Known non-findings

- **Share pages (`/r/{token}`) have no controls or feedback**; `DomainView.ReadOnly` is deliberate.
- **The offline page (`/offline`) carries no person, toast or session**; the worker caches it on devices.
- **Admin pages may name the model provider**; app pages never do.
- **Text inputs take `Literal: true` only for domain and slug**; names and free text don't.
- **Email inputs get Literal behavior automatically.**
- **Avatar colors are the six token pairs**; they never use warn or danger.
- **Icon marks render in currentColor** by design (`internal/web/icons`).
- **A failed or unchecked answer reads as "unchecked", not a problem**; copy that avoids alarm there is deliberate.
- **Generated files** (`*_templ.go`, `internal/db/gen`, `icons_gen.go`) are never evidence.
- **Frozen history**: docs/superpowers/specs and plans are not audited.
- **The Combobox's phone bottom sheet is a `<dialog>`** that app.js creates at enhance time; it is not a raw dialog.
- **Select with under about 8 plain options** is the intended control, not a missing Combobox.
- **`TabHeader` has one consumer, the Services tab**, by an owner ruling on 2026-10-29: it is the head for a domain tab that carries header actions, and the other tabs open straight into cards with their own `h2`. Don't file its adoption ratio.
- **The avatar menu's Admin and Role entries are red** (`layout.templ`, superadmins only): a deliberate mark of the superadmin area, not `danger` decorating.

Peer-check specific (dimensions 5 and 7), where a difference is correct:

- **Domain tabs differ in content by design**; only chrome and flow differences count.
- **Role-limited pages** (Settings is admin only; archive and workspace archive are higher roles) are missing for lower roles on purpose.
- **Superadmin pages are not peers of workspace pages.**
