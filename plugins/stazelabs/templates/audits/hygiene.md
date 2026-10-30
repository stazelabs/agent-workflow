# Audit pack: hygiene

Read by /stazelabs:hygiene. Headings are fixed; see the plugin's docs/audit-packs.md.

## Standards

<The instruction file and rule files to read in full, and which sections matter most.>

## Pre-pass

<Commands to run before any subagent: build, vet, lint, coverage. Optional manual tools and when to run them.>

## Dimensions

| # | Dimension | What it hunts |
|---|---|---|
| 1 | Dead code and unused surface | <in this project's terms> |
| 2 | Duplication | <...> |
| 3 | Architecture and layering | <...> |
| 4 | Data and query correctness | <...> |
| 5 | Security | <...> |
| 6 | Performance and resource use | <...> |
| 7 | Error handling and observability | <...> |
| 8 | Test coverage and quality | <...> |

<Cross-cutting invariants and which dimension owns each.>

## Search surface

<Paths the subagents search, and what to skip.>

## Known non-findings

- <A deliberate choice never to file, and why.>

## Verification notes

<Optional: how to confirm each dimension's claims in this codebase.>
