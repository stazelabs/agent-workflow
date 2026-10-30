# Migrating a project onto the plugin

For a project that already has local copies of these skills in `.claude/skills`.

1. Install the plugins at project scope so the repo records them for teammates:
   ```
   /plugin marketplace add stazelabs/agent-workflow --scope project
   /plugin install stazelabs@agent-workflow --scope project
   /plugin install stazelabs-go@agent-workflow --scope project     # if it deploys to Fly
   ```
   This writes `extraKnownMarketplaces` and `enabledPlugins` into `.claude/settings.json`.
2. Run `/stazelabs:setup`. Answer from what the local skills hard-coded: the team and prefix, the gate line, the smoke rule, the review threshold and paths, the hard stops, the deploy target. Compare the result with `examples/example-app/profile.json`.
3. Delete the local copies that the plugin now provides: `.claude/skills/ticket`, `.claude/skills/plan`, `.claude/skills/preview-deploy`. While both exist, the bare `/ticket` resolves to the local copy and `/stazelabs:ticket` to the plugin's.
4. If `.claude/settings.json` carried the gopls hook, remove it: `stazelabs-go` ships it.
5. Add a line to the project's instruction file saying the workflow skills come from the agent-workflow plugin and `/stazelabs:setup` writes the profile.
6. Audit skills: for each local `.claude/skills/<audit>/SKILL.md` (hygiene, continuity, qa, update-docs), move its project-specific parts (dimension tables, search surface, known non-findings, boot steps, frozen paths) into `.claude/agent-workflow/audits/<audit>.md` under the headings in `plugins/stazelabs/docs/audit-packs.md`, verbatim where possible. Move `state.json` to `.claude/agent-workflow/state/<audit>.json` unchanged; the shapes carry over. Then delete the local skill. Compare with `examples/example-app/audits/`.
7. Keep anything the plugin doesn't provide (`.claude/rules`) where it is.
8. Commit `.claude/agent-workflow/`, `.claude/settings.json` and the deletions in one PR.
