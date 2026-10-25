# ADR-0017: Measure Meta ads conversions with a minimal Meta Pixel

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** Sandeep (owner), Claude

## Context

We start paid ads on Facebook and Instagram. Sandeep wants the ads to bring the most previews and payments.

Without a Pixel, Meta cannot see what happens on vivah.online. A campaign can then optimise only for link clicks. Cheap clicks often come from people who do not intend to buy.

The privacy page promised "no remarketing", and the Google tag already counts conversions only ([ADR-0013](./0013-measure-google-ads-conversions.md)). The Meta plan of 24 Oct said: no Pixel until a separate decision. Sandeep made that decision on 2026-10-25 and chose to add the Pixel before the first campaign.

## Decision

We will add the Meta Pixel for conversions only, the same shape as the Google tag:

- The Pixel loads on the product site and on the preview page. Guest invite pages get no Pixel.
- It sends two standard events. `Lead` is sent when the sign-up card makes a preview. `Purchase` is sent on the payment-success screen, with the amount in INR and the payment id as `eventID`. A refresh of that screen does not send the purchase again.
- It sends no `PageView`. `autoConfig` is off, so Meta does not collect button clicks or page metadata by itself.
- The site never sends a name, a phone number or an email. "Automatic advanced matching" stays off in Events Manager.
- We do not build website custom audiences from the Pixel. The "no remarketing" promise stays true.
- The privacy page names Meta as an ad platform that learns about previews and payments, and its cookie.
- The Pixel id is a `NEXT_PUBLIC_*` build argument. Without the id, the site has no Pixel.
- No cookie banner, for the reasons in ADR-0013 (Option A).

## Alternatives considered

### Option A — a minimal browser Pixel (chosen)

It needs no secret and no server change. Meta can optimise a campaign for `Lead` at once.

### Option B — no Pixel; optimise for WhatsApp conversations

Meta can optimise click-to-WhatsApp ads for chats started, with no code. It was offered on 2026-10-25. Sandeep chose the Pixel, because most couples make their preview on the site, not in a chat.

### Option C — the Conversions API from the server

It counts a payment made in another browser (the WhatsApp link). But it needs an access token stored as a secret, and Meta matches better with hashed customer data, which we do not send. It is a good second step, not the first.

### Option D — Meta's full snippet

Meta's copy-paste code sends `PageView` on every page and turns on automatic collection. That is more data than we need, so it was rejected.

## Consequences

**Good**

- Meta can optimise for previews made (`Lead`), and later for purchases with the real amount.
- No new npm dependency. `next/script` loads Meta's library.

**Bad**

- Meta's script loads on every product-site visit and sets the `_fbp` cookie.
- A payment in another browser reaches Meta only if Option C is built.
- Meta can see the IP address and the browser of each visit that sends an event.

**Neutral**

- Nothing new is stored in Firestore.

## Revisit when

- Purchases per month pass about 50. Then consider the Conversions API (Option C).
- We want retargeting. That breaks the "no remarketing" promise, so it needs a privacy page change and a new ADR first.
- We run ads outside India. Then add a consent banner.

## References

- [Meta: Pixel standard events](https://developers.facebook.com/docs/meta-pixel/reference)
- [Meta: turn off automatic configuration](https://developers.facebook.com/docs/meta-pixel/advanced/#automatic-configuration)
- `components/ads/MetaPixel.tsx`, `lib/meta-pixel.ts`
