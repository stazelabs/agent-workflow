# Landing a state file

The audit skills record each run in `.claude/agent-workflow/state/<skill>.json`. When the profile's `state.committed` is false, the folder is gitignored: write the file and stop there. Otherwise the file reaches `repo.mainBranch` through its own PR, never a direct push:

1. `git checkout -b chore/<skill>-state-<YYYY-MM-DD>` from the current main (add `-2` if the branch exists).
2. `git add` **only** `.claude/agent-workflow/state/<skill>.json`. The tree may carry unrelated work; never sweep it in.
3. Commit `chore(<skill>): record <YYYY-MM-DD> run`, ending with the attribution line from the session's system reminder.
4. `git push -u origin <branch>`, then `gh pr create --base <repo.mainBranch>`. End the body with the session's PR attribution line.
5. Wait until `gh pr view <n> --json mergeStateStatus` reads `CLEAN`. GitHub often says "Base branch was modified" right after a push, so wait and retry. If it still won't merge for some other reason, stop and report.
6. `gh pr merge <n> --<repo.mergeStyle>`, adding `--delete-branch` when `repo.deleteBranchOnMerge` is true.
7. `git checkout <repo.mainBranch> && git pull --ff-only origin <repo.mainBranch>`.

A state-only change needs no gate. When `repo.neverTriggerCI` is true, never dispatch a workflow.
