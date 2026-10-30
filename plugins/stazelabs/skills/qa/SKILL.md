---
name: qa
description: Periodic live-app QA audit that boots a disposable copy of the project's web app, drives it through Chrome, and files grouped, model-tagged tickets; audit-only, never fixes. The boot steps, flows and limits come from the project's audit pack. Use when the user runs /stazelabs:qa, or asks to smoke-test the app, click through the webapp, test flows in the browser, verify recently merged fixes live, or check pages for runtime errors, dark-mode or narrow-viewport defects.
argument-hint: (none) rotates focus areas; or name flows ("cases, inbox", "dark mode"), or "all"
---

# /stazelabs:qa: periodic live-app QA audit

This is the runtime sibling of `/stazelabs:continuity`, which reads UI standards from source. That skill audits what the code *says*. This one audits what the app *does*. It boots a scratch server and walks real flows in a real browser, catching the defects a source reader structurally can't: a 500 on submit, a console error on load, a page that breaks at 520px, a redirect that lands in the wrong place, a dark-mode surface that doesn't repaint, a switch that does nothing.

It has the same contract as its sibling: find, verify, file. **It never fixes.** No product code, no branches, no PRs. The output is verified defects plus tickets that `/stazelabs:ticket` can pick up.

Work the steps in order.

## 0. Read the profile and the pack, load tools, boot the scratch server

Read `.claude/agent-workflow/profile.json` at the project root (`${CLAUDE_PROJECT_DIR}`).

Stop, write nothing, and say exactly this when any of the following holds:
- the file is missing: "This project isn't set up for /stazelabs:qa yet: run /stazelabs:setup."
- `version` is lower than 1: "This project's profile is older than this skill expects: run /stazelabs:setup to migrate it."
- any of these keys is absent: `tracker.kind`, `tracker.team`, `tracker.prefix`, `tracker.modelLabels`, `repo.mainBranch`, `repo.mergeStyle`, `hardStops`: "The profile is missing <key>: run /stazelabs:setup."

Everything below reads the profile by its key names. Never substitute a remembered value from another project.

Read the pack at `.claude/agent-workflow/audits/qa.md`. If it is missing, stop: "No audit pack for /stazelabs:qa: run /stazelabs:setup to scaffold one." Read everything its **Standards** section lists. A QA defect is stronger when it names the convention that the runtime behavior breaks, and the code trace in section 5 needs that vocabulary.

Then load tools. Read `${CLAUDE_PLUGIN_ROOT}/trackers/<tracker.kind>.md` and follow its "Finding the tools" section. Load the browser tools in **one** `ToolSearch` call:

```
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__read_network_requests,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__resize_window,mcp__claude-in-chrome__javascript_tool
```

If the Chrome tools aren't available, stop: "This skill drives Chrome through the Claude in Chrome extension; connect it and run again." Invoke the `anthropic-skills:chrome-browser` skill before the first browser step, when the session lists it.

### The target is always a scratch server

**Never touch anything in the pack's Never targets section.** Those are the owner's live working state. Boot the target exactly as the pack's **Boot** section says, in the background (`run_in_background`), and record its port and PID. Keep the boot environment for every later command in the run, because CLI subcommands that mint sign-in links or grant roles find the scratch data through it. Then:

1. **Is the server up?** The pack's health URL answers. If the server exited, read its log and stop.
2. **Mark the server log.** Note its current line count so that section 4 reads only this run's lines.
3. **Sign in** the way the pack says. Open sign-in links in a **new tab**. Confirm the link's host is the scratch port; if it names anything else, stop.
4. **Elevate on the scratch data only**, as the pack says, never without the scratch environment exported.

### Chrome-tool safety rules

- Work in a **new tab** of your own, and never take over the owner's existing tabs. Close the tabs you opened at the end.
- **Never trigger a native `alert()`, `confirm()` or `prompt()`**: they freeze the extension. A finished app shouldn't have any, so finding one is itself a finding: report the element without clicking it.
- Stay on the scratch host and port. Don't follow links that leave it, and never navigate to a Never target.
- Don't read or echo cookies, session tokens or sign-in links from page JS (the extension blocks them anyway). Return counts and short strings from `javascript_tool`, never whole documents or `outerHTML` dumps.
- Don't enter real credentials, real email addresses, or anything from the owner's accounts.
- If an element won't click, a page hangs or the extension stops responding, stop after 2 or 3 attempts and tell the user. Don't loop.
- Dialogs that need a human (permission prompts, file pickers) are the user's to answer.

## 1. Pick this run's focus areas

Read `.claude/agent-workflow/state/qa.json` (`{"runs":[]}` when missing; shape in section 7). It records which areas each prior run covered, and when.

**Default: the 3 areas least recently covered.** The user's argument overrides this. `all` does everything and is very expensive, so confirm first.

**Fix verification beats rotation when fixes have just merged.** At preflight, list the tickets that earlier runs filed (the state file's `tickets`) and check which have landed with `git log --grep='<identifier>'`. Offer "verify the N fixes since the last run" as the first option, before the rotation default. Re-walking freshly merged fixes is the highest-yield run: some come back clean, some expose a second-order defect, and some introduce a worse bug than the one they fixed.

Areas rotate on two axes: **flow slices**, which walk one flow deeply, and **cross-cutting passes**, which walk one behavior across many pages. Both come from the pack's **Areas** section. A default run mixes the two: 2 flow slices plus 1 cross-cutting pass.

The skill knows these passes. The pack may add to them, or override one with a `### Pass <X>` subsection:

| Pass | What to exercise |
|---|---|
| N | **Console and network sweep**: visit every reachable page in the pack's flows. After each one, `read_console_messages` (errors only) and `read_network_requests` (4xx and 5xx, and any request to a host other than the scratch host). |
| O | **Dark mode**: see below. |
| P | **Narrow viewport (320 to 520 px)**: see below. |
| Q | **Keyboard and focus**: tab through the navigation, the switches, the forms and the sign-out control. Focus is always visible, the order follows the page, Enter and Space operate switches and buttons, Escape closes anything that opens, nothing traps focus, and the active tab carries `aria-current="page"`. |
| R | **Validation and errors**: submit forms empty, oversized and malformed. Expect inline errors or a flash, never a 500, never a lost form, never a native alert. Check what the Standards say about success and missing-entity handling. |
| S | **Role gating with real second accounts**: the pack's Pass S says how to get them. Walk as each lower role. Layer 1 (UI): the role's forbidden controls are absent. Layer 2 (route): paste a gated URL by hand and expect the project's denial (a redirect, flash or refusal), never a 500 and never the page. A hand-built POST proves nothing beyond what the tests cover, so drive the UI. |
| T | **Recently merged fixes**: re-walk the flow of each fix that landed since the last run (section 1). |

### Pass O: dark mode

Find out from the pack, or the CSS, whether the theme follows the OS (`prefers-color-scheme`) or a toggle. When it follows the OS, which this toolchain can't change, state the current OS theme first (`matchMedia('(prefers-color-scheme: dark)').matches` via `javascript_tool`). If it's light, ask the user to switch the OS to dark for the pass, or accept a source-level read of the token definitions and mark the pass **untested (needs OS dark)**. Re-walk the sampled pages and hunt for surfaces that didn't swap: a white card on dark paper, dark text on a dark panel, a badge whose tone vanishes, currentColor marks that disappear, warning and danger tones that lose contrast. Afterwards, ask the user to switch back.

### Pass P: narrow viewport, 320 to 520 px

Most failures here are quiet: rows that don't stack, tables that push the page sideways, inputs under 16px (iOS Safari zooms the page when one gets focus), tap targets that crowd.

**`resize_window` lies in three ways, so measure, never assume.**

1. It always reports success, including when it does nothing.
2. It honors the width but not the height, because the browser's chrome comes out of the requested height.
3. It has a floor, and asking for less wedges the window: every later `resize_window` on that window silently no-ops, in both directions. The floor has varied between sessions (about 580 in some, 610 in others), so a true 320 or 390 viewport is usually **not** reachable. Ask for about 600 first, read what you actually got, and don't go hunting lower.

**One fresh window per size.** `tabs_create_mcp` opens a tab in the *current* window, so a tab opened after shrinking inherits the wedged width. To recover, close every tab you opened (`tabs_close_mcp` until the group is removed), then call `tabs_context_mcp{createIfEmpty:true}` for a fresh window. After the pass, close the narrowed windows outright; don't resize them back.

**The first action after every resize is the probe.** Read `viewport.mq` (a live `matchMedia` for `sm`, `md` and `lg`), not `innerWidth`, which can be stale. A pass run at the wrong width reports the wrong breakpoint's behavior as fact.

**Close the gap between the window floor and a phone by measuring intrinsic width.** Everything below `sm` (640) behaves alike, so a min-content measurement taken in a roughly 600px window is faithful for 320 to 520. From a sub-`sm` page, fetch a surface and measure a suspect row in a narrow host:

```js
const host = document.createElement('div');
host.style.cssText = 'position:fixed;left:-9999px;top:0;width:288px'; // 320 minus 2x16px padding
document.body.appendChild(host);
const doc = new DOMParser().parseFromString(await (await fetch(path)).text(), 'text/html');
host.innerHTML = ''; host.appendChild(document.importNode(doc.querySelector('main'), true));
// then compare scrollWidth to clientWidth on the row or header under test
```

Vary the host width: `288` (320), `328` (360), `360` (393), `408` (440), `488` (520). Two things don't work. An iframe sized to 393 fails when the app sends anti-framing headers, because `contentDocument` comes back null; that's correct security behavior, not a defect. Setting a width on the page's outer wrapper fails too, so constrain a container *inside* it instead.

**Run [`probes/narrow.js`](probes/narrow.js) on every sampled page** (`${CLAUDE_PLUGIN_ROOT}/skills/qa/probes/narrow.js`). Paste the whole file into `javascript_tool`; it's one expression. It reports:
- viewport truth, including `mq`;
- horizontal overflow of the body, with the culprit and whether an `overflow-x` ancestor legitimately contains it;
- header and row column parity for each table;
- tap targets under 24px in both dimensions, plus crowded pairs;
- reveals that only appear on hover;
- input font sizes under 16px below `sm`;
- the header's position against the main content.

**The probe locates; it doesn't convict.** Confirm each entry on screen and trace it to a `file:line` (section 5). It assumes Tailwind's default breakpoints, so when the project uses others, read `mq` against the project's own values. The probe output is correct, not a finding, in these cases:
- A control under 44px isn't automatically a finding. The finding is crowding or a target that's hard to hit, never the number alone. The probe's threshold is 24px.
- A table that scrolls sideways inside its own `overflow-x-auto` wrapper is correct. Only the **page body** scrolling horizontally is a defect, and `containedBy` marks the sanctioned case.
- A mismatch between window and viewport comes from the resize tool, not the app. Recover as above, and never file it.
- A 16x16 native checkbox is the browser's own control, and counts only if crowded.
- A clean result at 580 isn't evidence about 320. Use the intrinsic-width measurement.

## 2. Drive the browser: sequentially, in the main loop

**Don't parallelize this across subagents.** There is one Chrome and one signed-in session, and two agents driving one browser corrupt each other's state. Walk the flows yourself, one at a time. Budget the run by keeping the focus narrow, not by rushing.

The working rhythm on each surface:

1. **Navigate.** Prefer clicking the app's own nav and links over typing URLs, because broken reachability is itself a finding. Type a URL only to test direct addressability.
2. **Look at the rendered result** with a screenshot via `computer`. Does it match what the page claims to do? Check empty states, counts and badges.
3. **Interact**: the slice's flows from the pack.
4. **Check the console and network** after each page or mutation: `read_console_messages` (errors only), and `read_network_requests` for 4xx and 5xx. A page that looks clean but logs a console error is a finding.
5. **Record candidate defects as you go**: repro steps (the URL and the exact actions), expected versus actual, the console, network and server-log evidence, and a screenshot when the defect is visual.

**Three automation rules:**

- **Screenshots lie mid-transition: settle, then measure.** The tool-driven tab often reports `visibilityState=hidden`, which freezes transitions mid-fade. A suspicious *visual* state gets a wait of 2 seconds or more and a DOM check before it gets a ticket. A suspicious *missing action* gets a server-log check for whether the request was ever sent. Repeated `javascript_tool` calls steal focus, so take the screenshot first.
- **Target elements by `aria-label`, `name` or label text, never by index.** `querySelectorAll('button')[n].click()` can hit the wrong control.
- **Wait for async work.** Anything that arrives by polling gets the time the pack or the project's smoke test allows before it counts as missing.

**Test-data hygiene.** The scratch database is disposable, but give what you create a `QA-` prefix anyway, so that a failing run's screenshots and tickets are unambiguous.

## 3. Hard limits: never cross these

- The pack's **Never targets** and **Limits** are absolute.
- Every `hardStops` item waits for the owner's explicit yes in chat, for that specific action.
- **Never send real email, and never make live paid API calls**, unless the pack says the scratch environment makes one safe. If the app ever claims a real send, stop and tell the user. Invite only `@example.com` addresses.
- Destructive admin tools may be used only on `QA-` data you created on the scratch server.
- **Stop the server by PID** (`kill <pid>`), never `pkill -f`.

If a flow can't be tested within these limits, report it as **untested (out of bounds)** rather than improvising around the limit.

## 4. Triage the catch: separate defect from environment

Raw observations from a live run are noisier than grep hits. Classify each one before filing:

- **Real defect**: reproducible, and the app is wrong. A 500, a console error from the app's own JS, a broken layout, a wrong redirect, a validation hole, a copy-rule violation live on screen.
- **Environment noise** (drop silently): extension or devtools console chatter, a failed navigation while the server was still starting, anything the pack's **Triage** section lists.
- **Data artifact**: the page is correct, but the scratch data is odd.
- **Cache, not app**: a suspicious empty state after a mutation you know succeeded can be Chrome serving a cached page. Confirm against the scratch data, as the pack says, and force a real fetch (`?cb=1`) before believing it.
- **Service worker, not app**: a stale static file right after a rebuild may be the worker doing its job. Re-test after one reload.

For each defect that survives, **read the fresh server log** from the section 0 mark for the matching request, using the pack's greps in the log's real format. **Prove the pattern matches before trusting a zero.** A healthy run shows a large count of successful responses; if that comes back empty, the pattern is wrong, not the app. Every "I found nothing" claim needs the instrument shown to fire on the positive case.

## 5. Verify against the code: this is the gate that matters

A browser observation becomes a fileable finding only once it's traced to source. For each defect that survives:

1. **Reproduce it once more** cleanly, with a fresh navigation and no leftover form state. If it doesn't reproduce twice, it's flaky: don't file it unless the log evidence stands on its own.
2. **Find the code** through the pack's **Code map**, never in generated output. Cite `file:line`. A QA ticket with repro steps *and* the offending line is immediately actionable.
3. **Name the convention it breaks**, when one applies, from the Standards documents.
4. **Dedupe** with the adapter's search verb in `tracker.team` before filing.
5. **When exonerating a dependency, the control must not reuse the suspect setup.**

Drop whatever fails. **A short list of confirmed, reproducible defects beats a long list of maybes.** Group the survivors by root cause, not by page.

## 6. Present for approval, then file

Show the user:
- the areas covered, and why;
- each proposed ticket: title, severity, repro steps, the traced `file:line`, a screenshot reference, and a proposed Model label from `tracker.modelLabels` (`haiku` for mechanical work, `sonnet` where there's divergence risk, `opus` for architectural or judgment-heavy work, `fable` only if the user asks);
- the flows left **untested (out of bounds)**;
- one line for each dropped observation, so the user can overrule.

**Stop and wait for explicit approval.** Then create each approved ticket with the adapter's create verb:

- **Title**: verb-led, symptom first: "Fix 500 on case note submit when the note is empty".
- **Description**: repro steps (the URL, the actions, the data used), expected versus actual, the console, network and server-log evidence quoted, the traced `file:line` and suspected cause, and a "found by /stazelabs:qa on <date>" footer.
- **Labels**: list the team's labels first. Apply exactly one Model label plus an existing type label (the bug-type one for defects). **Never invent a label** without asking.
- **Priority**: Urgent for data loss or a security hole observed live. High for a broken primary flow. Leave the others at the default.
- **Cross-references**: never guess a ticket id in a body. Create the referenced ticket first, then cite the identifier the create verb returned.

When the user calls a dropped observation intentional, offer to add it to the pack's **Known non-findings**, and to the project's instruction file if it belongs there.

## 7. Clean up and update the run state

1. **Stop the scratch server by PID** (`kill <pid>`, never `pkill -f`), then do the pack's **Cleanup**.
2. Restore anything you changed: ask the user to switch the OS theme back after the dark pass. **After the narrow pass, close the narrowed windows outright** (`tabs_close_mcp` on every tab the pass opened) rather than resizing them back, because a window near the floor can't be resized again. Leaving the user a 600px-wide Chrome window is the cleanup miss they'll notice immediately.
3. Close the tabs you opened.
4. Write `.claude/agent-workflow/state/qa.json`, appending this run and keeping the last ~12:

```json
{
  "runs": [
    { "date": "YYYY-MM-DD", "areas": ["B", "F", "N"], "tickets": ["<PREFIX>-12"], "findings": 3, "untested": ["O: OS was light"] }
  ]
}
```

Use the real current date from the environment. Beyond the fields above, record:
- `verified_working`: what was clean, which is the evidence the next run needs to skip it;
- `dropped`, each with its reason;
- a `notes` line naming any method lesson, so it can be folded into the pack (or proposed for this skill) rather than learned again.

5. Land the state file as `${CLAUDE_PLUGIN_ROOT}/docs/landing-state.md` describes. Approved pack edits go in the same commit.

## 8. Report

Report the areas covered, defects confirmed versus dropped, tickets filed (identifiers and URLs), out-of-bounds flows skipped, the cleanup performed, and which areas are up next run. A clean area is a real result: say so plainly rather than manufacturing a finding.

## Guardrails

- **Audit only.** No product-code edits, and no status changes on existing tickets. The only writes are new tickets, the state file and approved pack edits (landed through their own chore PR, section 7).
- **The section 3 limits are absolute**: scratch server only, nothing in Never targets, no `hardStops` action without a yes.
- **One browser, one driver**: never fan the browser out to subagents.
- **Every filed finding is reproducible** (or proven by the log) **and traced to a `file:line`.**
- **Nothing is filed before the user approves** (section 6).
- **Never trigger native dialogs**: report the element that would, without clicking it.
- **Never create a new tracker label** without asking.
