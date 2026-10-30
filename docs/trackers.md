# Tracker adapters

The workflow skills never name a ticketing product in their steps. They use a dozen verbs (read a ticket, read comments, set state, comment, set labels, list children, list labels, list teams, create label, who am I) and read an **adapter file** that maps those verbs to the tools of the tracker the project uses.

- The project's profile names the adapter: `tracker.kind`.
- The adapter lives at `plugins/stazelabs/trackers/<kind>.md`. v1 ships `linear.md`.
- Every adapter has the same two sections: **Finding the tools** (how to locate the MCP tools at run time, since server prefixes differ per machine) and **Verbs** (the table).

## Adding a tracker

1. Copy `linear.md` to `<kind>.md` and fill both sections for the new tool set. Keep the verb names.
2. State the semantics the skills rely on and how they hold (or don't) in this tracker: epic detection, state names, whether a label write replaces or merges.
3. Add the `kind` to `/stazelabs:setup`'s choices and to `docs/profile.md`.
4. Nothing in `plan` or `ticket` changes. If it has to, the seam is wrong; fix the verb list instead.

Not an adapter: the tracker's MCP server itself. People connect that in their own client; the adapter only finds it.
