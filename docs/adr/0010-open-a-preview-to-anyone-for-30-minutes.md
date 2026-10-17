# ADR-0010: Open a preview to anyone with the link, for 30 minutes

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** Sandeep
- **Amends:** [ADR-0009](./0009-open-a-preview-in-two-browsers.md), the bullet "only those two browsers open the preview"

## Context

[ADR-0009](./0009-open-a-preview-in-two-browsers.md) lets two browsers open a preview, then locks it. A third browser sees "Open this preview on your own phone". The couple often wants to show the preview to family on another phone. The lock stops that, and it does not stop a screenshot.

A preview that stays open for 48 hours gives the couple no reason to decide. A short, visible deadline does.

## Decision

Anyone with the preview link sees the preview, for 30 minutes. Then it closes for everyone.

- The first `GET /p/<id>` stores `viewEndsAt`, 30 minutes later, on the lead. The timer is on the server, so a reload or another phone does not reset it.
- The notch at the top of the preview shows the countdown, and the note "Complete payment within 30 minutes. This link is disabled after that."
- At zero the page refreshes. The server then shows "This preview has closed", with a button to message us on WhatsApp.
- An admin reactivates a closed preview from `/admin/previews/<id>`. That clears `viewEndsAt`, so the next open starts a fresh 30 minutes. It also clears the two browser bindings, as before.
- The two-browser binding stays, for publishing only. A third browser sees the invite without the publish banner. [ADR-0007](./0007-publish-from-the-bound-preview-browser.md) is unchanged.
- An unopened link still expires 48 hours after it was made (`expiresAt`).
- A paid lead never closes. It is the couple's live invite.

## Consequences

- The couple can show the preview on any phone while the timer runs.
- The timer starts when the sign-up card opens the preview on screen. The WhatsApp link opens the same timer, not a new one.
- Publishing checks `expiresAt`, not `viewEndsAt`. A payment that starts just before zero still completes. The first open moves `expiresAt` past `viewEndsAt` when it is earlier.
- Older leads have no `viewEndsAt`. The field is optional. Their next open starts the timer. No migration is needed.

## Alternatives considered

- **Start the timer when an admin reactivates.** The couple may open the link much later and find it closed. Rejected: the timer starts on the next open.
- **Keep the preview open and stop only the publish banner.** The preview would not be "disabled", which is what Sandeep asked for. Rejected.
