# Tracker adapter: Linear

The skills speak to the tracker through the verbs below. This file maps each verb to a Linear MCP tool and its arguments. The project's profile says `tracker.kind: "linear"`.

## Finding the tools

The Linear MCP is a connector the person set up themselves; it is not bundled. Its tools are deferred and their full names carry a server prefix that differs between machines (`mcp__linear-server__get_issue` on one, `mcp__linear__get_issue` or `mcp__claude_ai_Linear__get_issue` on another). Never hard-code a prefix.

1. `ToolSearch` with the keyword query `linear get_issue save_issue list_issues save_comment list_comments list_issue_labels list_teams save_issue_label`, `max_results` 12. Load everything it returns whose name ends in one of the suffixes below.
2. Take the prefix from the first result (everything before the suffix) and use it for the rest of the run.
3. If nothing comes back, stop: "No Linear MCP is connected in this session. Connect it under /mcp (or your client's connectors) and run again."

## Verbs

| Verb | Tool suffix | Arguments and notes |
|---|---|---|
| Read a ticket | `get_issue` | `id`: the identifier (`EMAIL-12`) or a Linear URL's identifier. Returns `title`, `description`, `identifier`, `url`, `status`, `labels`, `team`, and whether it has sub-issues. Pass `includeRelations: true` to read `blockedBy`. |
| Read comments | `list_comments` | `issueId`: the identifier. Read every comment; plans and scope rulings live there. |
| Set state | `save_issue` | `id` and `state: "<name>"` using the profile's `tracker.states.*` names verbatim. Only if refused, `list_issue_statuses` for the team and use the `started` or `completed` type's name. |
| Comment | `save_comment` | `issueId`, `body` as markdown with real newlines (no escape sequences). |
| Set labels | `save_issue` | `labels` **replaces the whole set**. Always: take the current `labels`, drop any that is one of `tracker.modelLabels`' values, add the chosen one, send the merged list. Never drop a label you didn't mean to. |
| List children | `list_issues` | `parentId`: the epic's identifier. Page with `cursor` until exhausted. |
| List labels | `list_issue_labels` | Filter by `team` to confirm the Model label group exists. |
| List teams | `list_teams` | Used by setup to let the person pick; the team's `key` is the ticket prefix. |
| Create label | `save_issue_label` | `name`, `teamId`, optional `parentId` for a group. Setup only, after a yes. |
| Who am I | `whoami` | Setup's connectivity check. |

## Semantics the skills rely on

- Identifiers are `<PREFIX>-<n>`; the prefix is the team key and matches `tracker.prefix`.
- A ticket with sub-issues is an epic. Children already Done, Canceled or Duplicate are skipped.
- State names are stable per workspace; don't look them up on every run.
- `save_issue` with `labels` is the only label write, and it is a full replace (see Set labels).
