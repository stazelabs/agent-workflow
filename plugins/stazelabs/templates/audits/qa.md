# Audit pack: qa

Read by /stazelabs:qa. Headings are fixed; see the plugin's docs/audit-packs.md.

## Standards

<Documents that name the conventions a runtime defect can break.>

## Never targets

- <The owner's dev server, its database, tunnels, production hosts.>

## Boot

<Exact commands to start a disposable server in the background with a free port, recording PORT and PID; the health URL; the log path and format; how to sign in; how to get an elevated account.>

## Areas

Flow slices:

| Slice | Flow | Walk |
|---|---|---|
| A | <flow> | <routes and actions> |

Cross-cutting passes (the skill knows N console and network, O dark mode, P narrow viewport, Q keyboard and focus, R validation and errors, S role gating, T recently merged fixes; add or override here):

| Pass | What to exercise |
|---|---|
| S | <roles and how to get a second account> |

## Limits

- <Email, model calls, outbound network, destructive admin tools.>

## Triage

<Environment noise to drop, how to inspect the scratch data, and the log greps with the positive pattern that proves them.>

## Code map

<Routes, handlers, view sources, client JS. Generated files that are never evidence.>

## Cleanup

<Anything to remove beyond stopping the server by PID and closing tabs.>

## Known non-findings

- <Behavior that looks wrong and is intended.>
