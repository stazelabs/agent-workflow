# The shared preamble

Every skill in this marketplace opens with the same §0. Copy this text into a new skill and fill in the skill name and its required keys from `docs/profile.md` (the "Required by" column).

```markdown
## 0. Read the project profile

Read `.claude/agent-workflow/profile.json` at the project root (`${CLAUDE_PROJECT_DIR}`).

Stop, write nothing, and say exactly this when any of the following holds:
- the file is missing: "This project isn't set up for /stazelabs:<skill> yet: run /stazelabs:setup."
- `version` is lower than 1: "This project's profile is older than this skill expects: run /stazelabs:setup to migrate it."
- any of these keys is absent: <list the keys this skill needs, dotted, e.g. `tracker.kind`, `tracker.states.done`>: "The profile is missing <key>: run /stazelabs:setup."

Everything below reads the profile by its key names (`tracker.prefix`, `gate.command`). Never substitute a remembered value from another project.
```

For skills that talk to the tracker, add:

```markdown
Then read `${CLAUDE_PLUGIN_ROOT}/trackers/<tracker.kind>.md` and follow its "Finding the tools" section to load the tools it names. If no adapter file exists for `tracker.kind`, stop and say so.
```

For `/stazelabs:ticket`, add the superpowers check:

```markdown
Confirm the superpowers plugin is installed: its skills (`superpowers:test-driven-development`, `superpowers:requesting-code-review`) appear in this session's skill list. If they don't, stop: "This skill needs the superpowers plugin. Install it with /plugin install superpowers@claude-plugins-official, then run again."
```
