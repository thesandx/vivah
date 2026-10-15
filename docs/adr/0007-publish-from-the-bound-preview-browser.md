# ADR-0007: Publish an invite from the bound preview browser, with a test payment for now

- **Status:** Accepted
- **Date:** 2026-10-14
- **Deciders:** Sandeep

## Context

[ADR-0006](./0006-accept-anonymous-lead-capture.md) allows one anonymous write: creating a lead. The next step in the funnel is also before any account exists. On the preview page, the couple chooses an address (`radha-shyam.vivah.online`) and publishes the invite.

Two addresses must never collide. Firestore has no unique index, so a check followed by a write can lose a race.

Payment is not connected yet. Cashfree is the chosen gateway. Until its keys exist, the product owner wants a test payment button that publishes at once, so that the whole flow can be tried on the live site.

## Decision

Publishing is the second write with no session. It is a Server Action on the preview page (`app/(invite)/preview/[id]/actions.ts`), not a route under `/api/`. The preview cookie has the path `/preview/<id>`, and an action posts to the page it runs on, so the browser sends the cookie.

- **Who may publish.** Only the browser that holds the lead's preview cookie. The token is compared with the stored SHA-256 hash in constant time. This is the same proof the preview page uses to show the invite.
- **One address, one couple.** `publishWedding` runs one transaction. It reads the lead, a `slugClaims` document and any wedding at that slug. Then it creates the wedding, creates the claim, and marks the lead paid. The claim id is the SHA-256 of the slug, and `createWithId` uses `tx.create`, which fails if the claim exists. Two simultaneous publishes cannot both succeed. A wedding at that slug without a claim also counts as taken, so nothing is ever overwritten.
- **A second tap** answers with the address that the lead already has. It does not publish twice.
- **Test payment.** The button publishes without taking money. The page says so in words. When Cashfree is connected, the button opens a Cashfree payment link instead, and the Cashfree webhook calls `publishWedding` when the link status is `PAID`. The transaction and the claims stay the same.

## Consequences

- While the test payment is in place, anyone who creates a preview can publish an invite for free. That is intended for testing. Replace the button before launch.
- One extra collection, `slugClaims`, one document per published address.
- `Repository.inTransaction(tx)` binds a repository to a transaction that another repository opened. This is how one transaction spans three collections.
- Every other write route keeps `requireUser()`.

## Alternatives considered

**A route handler at `/api/leads/<id>/publish`.** Rejected: the preview cookie is scoped to `/preview/<id>`, so the route would not receive it. Widening the cookie path to `/` sends it with every request.

**The slug as the wedding document id.** It would make uniqueness free. Rejected: the repository refuses short, human-readable ids because they make write hotspots (see `lib/document-ids.ts`), and a slug such as `anu-2` looks like a counter.

**Publish only after a real payment.** Correct for launch. Deferred: the Cashfree keys do not exist yet, and the owner wants to test the flow now.
