---
name: preview-deploy
description: Deploy the project's main branch to its preview environment by cutting and pushing a unique tag (the profile's deploy.tagPrefix) that triggers the gate-first deploy GitHub Action, then watching the run and checking the health endpoint. Use when the user runs /stazelabs-go:preview-deploy or asks to ship, deploy or release the preview.
argument-hint: (none) deploys current main
---

# /stazelabs-go:preview-deploy: ship main to the preview

A deploy is an intentional act from a committed commit, never a deploy of a working tree. Shipping means pushing a `<deploy.tagPrefix>*` tag, which fires the workflow `deploy.workflow` in `.github/workflows`. That workflow re-runs the gate, then deploys to the app `deploy.app` at `deploy.provider`. The project's runbooks are the files in `deploy.runbooks`; read the one about routine deploys before the first run in a project.

Requires `gh` authenticated and the `origin` remote. Work the steps in order.

## 0. Read the project profile

Read `.claude/agent-workflow/profile.json` at the project root (`${CLAUDE_PROJECT_DIR}`).

Stop, write nothing, and say exactly this when any of the following holds:
- the file is missing: "This project isn't set up for /stazelabs-go:preview-deploy yet: run /stazelabs:setup."
- `version` is lower than 1: "This project's profile is older than this skill expects: run /stazelabs:setup to migrate it."
- `deploy` is absent: "This project has no deploy section in its profile. If it deploys through a tag-triggered action, run /stazelabs:setup and answer yes to the deploy question."
- any of these keys is absent: `repo.mainBranch`, `deploy.provider`, `deploy.app`, `deploy.url`, `deploy.healthz`, `deploy.tagPrefix`, `deploy.workflow`, `deploy.runbooks`: "The profile is missing <key>: run /stazelabs:setup."

If `deploy.provider` is not `fly`, stop: v1 of this skill knows Fly only. Everything below reads the profile by its key names.

## Hard gate: the owner says yes, every time

Nothing here pushes a tag or touches the provider without an explicit owner "yes" in chat for this specific deploy.

- Before creating or pushing any tag, state exactly what will deploy:
  - the commit (short sha and subject);
  - the tag name you computed;
  - a summary of what changed since the build the preview is serving (`git log --oneline <serving-sha>..HEAD`, grouped in a few lines; the serving sha comes from the site if it shows one, else the last tag whose run succeeded; say so if there is no earlier tag).
- Then stop and wait. Only an explicit "yes" (or equivalent) in chat for this deploy counts. Silence, a prior approval, or "go ahead" said for an earlier deploy does not.
- Approval never carries over. A later deploy, a retry after a failed run, or a new tag all need a fresh ask.
- If the commit or tag changes after the owner answered, ask again.

## 1. Preflight: main must be clean, pushed and current

Stop with a clear message if any check fails.

- `git fetch origin --tags --prune`, so the next-tag math sees tags from other machines.
- `git branch --show-current` must be `repo.mainBranch`. Do not auto-checkout.
- `git status --porcelain` must be empty.
- `git rev-parse HEAD` must equal `git rev-parse origin/<repo.mainBranch>`. If ahead, tell the owner to push first. If behind, tell them to `git pull --ff-only`.
- If the profile has `deploy.preDeployCheck`, remind the owner that the runbooks ask for it on this commit. Do not run it unasked; ask whether they have.

## 2. Check CI on this commit (best effort)

Only when the profile has `deploy.ciWorkflow`:

```
gh run list --workflow <deploy.ciWorkflow> --branch <repo.mainBranch> --commit "$(git rev-parse HEAD)" \
  --json status,conclusion,headSha --limit 1
```

- `success`: proceed.
- `failure` or `cancelled`: stop and report it (`gh run view`).
- In progress, or no run: proceed. A manual-dispatch workflow often has no run; that is normal. Never trigger it. The deploy workflow's own gate is authoritative.

## 3. Compute a unique tag

The trigger is `push: tags: ["<deploy.tagPrefix>*"]`. Pick the first free name:

```sh
PREFIX=<deploy.tagPrefix>
DATE=$(date +%Y-%m-%d)
if ! git rev-parse -q --verify "refs/tags/$PREFIX$DATE" >/dev/null; then
  TAG="$PREFIX$DATE"
else
  n=2
  while git rev-parse -q --verify "refs/tags/$PREFIX$DATE-$n" >/dev/null; do n=$((n+1)); done
  TAG="$PREFIX$DATE-$n"
fi
echo "$TAG"
```

The first deploy of a day is `preview-2026-10-11`, a second is `preview-2026-10-11-2`. Tags whose run failed the gate stay in place and count as taken, and a failed tag never deployed, so the change summary compares against what is serving, not the last tag.

## 4. Ask, then cut and push

Present the hard-gate summary and wait for "yes". After it:

- `git tag "$TAG"` (lightweight is fine), then `git push origin "$TAG"`.
- Tell the owner the tag name. Never push to main and never force-push.

## 5. Watch the run and verify

```
gh run list --workflow <deploy.workflow> --event push --limit 5 \
  --json databaseId,status,headSha,displayTitle
gh run watch <databaseId> --exit-status
```

- If the gate job fails, no deploy happened. Report the failing step. The fix is a normal change merged to main, then a new run of this skill with a new tag and a new "yes".
- If a required reviewer pauses the run, tell the owner to approve it in GitHub. Do not bypass it.
- If the gate passed but the deploy step fails or hangs on health checks, the new image is usually crash-looping at boot (most often a malformed secret). Read `fly logs -a <deploy.app> --no-tail` (read-only, fine to run) for the boot error, then point the owner at the runbook section on crash loops: they fix the secret, run `fly secrets deploy` if it shows `Staged`, and `fly machines start <id>`, because a stopped machine stays stopped. No new tag is needed; the image is already on the machine.
- On success, verify: `curl -fsS <deploy.url><deploy.healthz>` prints `ok`. Report the tag and the URL.

## 6. After a wiped volume

Only when this deploy followed a deliberate volume wipe (the owner will say so). A normal deploy keeps its data; skip this step. The runbooks say how the project recreates its first sign-in and administrator on an empty volume; follow them, and run any `flyctl ssh console -a <deploy.app> -C "<command>"` only with the owner's explicit yes for that exact command (`-C` with an absolute path, since the image may have no shell).

## Guardrails

- Never run `flyctl` or `fly` directly unless the owner asks for that command. The workflow does the deploy. Reading logs is the one exception.
- Never deploy from the working tree as the normal path. It bypasses the gate.
- This ships what main points at. It does not build, fix or commit code.
- Rollback is not this skill's job: the runbooks cover it (`fly releases`, `fly deploy --image`), run only if the owner asks. It reverts the binary, not the data volume. Migrations are forward-only.
- Never delete old deploy tags. Never wipe a volume to fix a failing deploy.
- Never touch DNS or mail-sending configuration.
