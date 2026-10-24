# ADR-0015: Erase test data from the admin dashboard

- **Status:** Accepted
- **Date:** 2026-10-24
- **Deciders:** Sandeep (owner), Claude Code

## Context

Before launch, the owner tested the site many times with his own phone numbers. Each test left a preview (`leads`) and often a published invite (`weddings`). He deleted the invites from `/admin`, but a delete is soft. So the Deleted tab and the Previews tab fill with test rows, and the real couples are hard to find.

The data rules allow a permanent delete only for an erasure request ([data-recovery.md](../data-recovery.md#rules-for-code-that-changes-data)). An agent session has no production data credentials, so an agent cannot run a cleanup script. A human must do it.

## Decision

We add a "Clear test data" page at `/admin/clean-up`, behind the admin session (ADR-0008). It lists every preview and every deleted invite with a checkbox. The admin ticks rows, types `ERASE`, confirms in a dialog, and the server erases the ticked rows with `hardDelete`.

- The server refuses a live invite and the preview of a live invite. A couple who paid and is live is never erased from here.
- An erased invite takes its guest links with it, and any claim it still holds on an address.
- `payments` documents stay. They are the record for accounting and refunds.
- The audit log stays, and gets one `test-data-erased` entry per erased row.
- Unpaid previews still in their week of nudges start unticked, because they can be real couples. Every other offered row starts ticked.
- One request erases at most 200 previews and 200 invites.

## Alternatives considered

### Option A: an admin page that erases ticked rows (chosen)

The owner sees every row before it goes, and decides each one. It needs no credentials outside the app, and it uses the same admin session as every other change.

### Option B: a one-off script with `--apply`

This is the usual path for a bulk write. But only the owner can run it, with `gcloud` and production credentials on his laptop. Choosing rows by id in a script is easy to get wrong, and a page shows names.

### Option C: hide test rows, but keep them

A "test" flag would keep the data recoverable. But the owner asked to delete the rows. Hidden rows still count in every list, and a flag adds a field to two collections for a one-time need.

## Consequences

**Good**

- The admin lists show only real couples again.
- The rule that protects live invites is in the server, not only in the form.

**Bad**

- An erased row has no restore button. Only point-in-time recovery, within 7 days, brings it back ([data-recovery.md](../data-recovery.md#recover-data)).
- A permanent delete is now one click away for an admin. The typed word and the dialog make it a deliberate act.

**Neutral**

- A `payments` document can name a lead that no longer exists. Nothing reads a payment through its lead after the payment is complete.

## Revisit when

- Real couples outnumber test rows, and the page has no further use. Then remove it.
- A second admin joins. Then consider a review step before an erase.

## References

- [ADR-0008](./0008-two-step-admin-sign-in.md): the admin session
- [data-recovery.md](../data-recovery.md)
