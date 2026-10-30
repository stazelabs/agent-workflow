# Migrating a project onto the plugin

For a project that already has local copies of these skills in `.claude/skills` (healthcheck.email was the first).

1. Install the plugins at project scope so the repo records them for teammates:
   ```
   /plugin marketplace add stazelabs/agent-workflow --scope project
   /plugin install stazelabs@agent-workflow --scope project
   /plugin install stazelabs-go@agent-workflow --scope project     # if it deploys to Fly
   ```
   This writes `extraKnownMarketplaces` and `enabledPlugins` into `.claude/settings.json`.
2. Run `/stazelabs:setup`. Answer from what the local skills hard-coded: the team and prefix, the gate line, the smoke rule, the review threshold and paths, the hard stops, the deploy target. Compare the result with `examples/healthcheck-email/profile.json`.
3. Delete the local copies that the plugin now provides: `.claude/skills/ticket`, `.claude/skills/plan`, `.claude/skills/preview-deploy`. While both exist, the bare `/ticket` resolves to the local copy and `/stazelabs:ticket` to the plugin's.
4. If `.claude/settings.json` carried the gopls hook, remove it: `stazelabs-go` ships it.
5. Add a line to the project's instruction file saying the workflow skills come from the agent-workflow plugin and `/stazelabs:setup` writes the profile.
6. Keep anything the plugin doesn't provide yet (the audit skills, `.claude/rules`) where it is.
7. Commit `.claude/agent-workflow/`, `.claude/settings.json` and the deletions in one PR.
