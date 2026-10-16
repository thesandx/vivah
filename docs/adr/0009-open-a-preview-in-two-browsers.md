# ADR-0009: Open a preview in two browsers, then lock it

- **Status:** Accepted
- **Date:** 2026-10-16
- **Deciders:** Sandeep
- **Amends:** [ADR-0006](./0006-accept-anonymous-lead-capture.md), the bullet "The preview binds to the first browser that opens it"

## Context

[ADR-0006](./0006-accept-anonymous-lead-capture.md) binds a preview to the first browser that opens `GET /p/<id>`. A forwarded link then shows nothing, and [ADR-0007](./0007-publish-from-the-bound-preview-browser.md) uses the same cookie to decide who may publish.

The sign-up card opens the preview on screen at once. With WhatsApp sending on (`services/whatsapp.service.ts`), the couple also gets the link on WhatsApp. That link usually opens in a different browser: WhatsApp's in-app browser, or the phone when the couple signed up on a laptop. With one binding, the WhatsApp link shows "Open this preview on your own phone" to the couple who asked for it.

## Decision

A preview binds to two browsers, then locks.

- The first `GET /p/<id>` stores the hash of a new token in `previewTokenHash`, as before.
- The first call from a browser that has neither token stores the hash of a second new token in `secondTokenHash`.
- After that, only those two browsers open the preview, and only those two may publish. `leadTokenMatches` checks both hashes, in constant time.
- An admin who reactivates a preview clears both.

## Consequences

- The WhatsApp link works for the couple after the card has opened the preview on screen.
- A couple who forwards the link before they open it in a second browser gives the second binding to the person they forward it to. The lead id is still unguessable, so this needs the couple's own action.
- Older leads have no `secondTokenHash`. The field is optional, so they get a second binding the same way. No migration is needed.

## Alternatives considered

- **Send the link by WhatsApp only, and do not open it on screen.** This proves the couple owns the number. It adds a step at the moment of most interest, so it was rejected.
- **Keep one binding.** The WhatsApp link would often fail for the couple. Rejected.
