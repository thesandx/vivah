# ADR-0014: Measure home page visits with our own beacon

- **Status:** Accepted. The preview page is measured too since [ADR-0019](./0019-track-the-preview-page.md).
- **Date:** 2026-10-23
- **Deciders:** Sandeep (owner), Claude

## Context

Sandeep wants to improve the home page funnel. He asked three questions:

- Which call to action led to each preview?
- How long do visitors spend on each home section?
- Where do visitors stop?

The site had no answer. The Google tag counts conversions only, and analytics stays denied ([ADR-0013](./0013-measure-google-ads-conversions.md)). The privacy page promises no analytics cookies and no remarketing. There is no cookie banner.

## Decision

We will measure the home page with our own small beacon. There is no third-party script and no cookie.

- `components/analytics/VisitTracker.tsx` runs on the home page only. It counts taps on elements marked `data-track-cta`. It counts the time each `data-track-section` holds the middle of the screen. The sign-up card reports the steps it reaches.
- It sends one beacon with `navigator.sendBeacon` when the tab is hidden or the page is left. It sends one at once when the card makes a preview.
- A beacon holds fixed ids from `lib/visit-tracking.ts`, numbers, and a random tab id from `crypto.randomUUID()`. It holds no name, phone number, IP address or free text. The tab id lives in `sessionStorage` and dies with the tab.
- A preview is credited to the last sign-up button tapped before it. A start in the hero card credits the hero card.
- `POST /api/visits` stores each beacon in `visitBeacons`. It is a write with no session. Its limits:
  - It creates one document, reads nothing back, and answers 204.
  - The body is a strict zod schema, at most 4 KB.
  - One IP may send 60 beacons in 10 minutes. The IP is not stored.
  - A crawler or headless browser is answered and not stored.
- `/admin` > Visitors merges the beacons into visits. It shows the scroll funnel, the time per section, where visits stopped, the sign-up card steps, the buttons, and the sources. Payments come from the `leads` collection, so a payment in another browser still counts.
- Couple invite and preview pages are not measured.
- Each beacon carries `expireAt`, 12 months after it was written. The privacy page says so.

## Alternatives considered

### Option A — our own beacon (chosen)

It answers all three questions, and it ties a button to a preview and a payment. It keeps the privacy promise and needs no banner. It adds about 3 KB of script and no new dependency.

### Option B — Microsoft Clarity

It is free and adds heatmaps and session replays. Rejected for now: it sets cookies and sends visit data to Microsoft. That needs a cookie banner and a privacy page change, and it adds a third-party script to the first page. It cannot credit a preview to a button without extra code.

### Option C — Google Analytics 4

Rejected: the same cookie and banner cost as Clarity, analytics consent is denied today, and its reports are harder to read for one funnel.

## Consequences

**Good**

- Sandeep sees which button and which section work, in `/admin`, with real payments.
- No cookie, no third party, no banner.

**Bad**

- A second anonymous write route. It can fill `visitBeacons` with junk. The schema and the rate limit keep each document small. Add a Cloudflare WAF rule on `/api/visits` if abuse appears.
- No heatmaps or replays. Add Clarity later, with a banner, if the numbers raise a question they cannot answer.
- The report reads at most 6,000 beacons per range. Above that, move the counts to daily totals.
- `expireAt` removes nothing until a Firestore TTL policy is on. A human turns it on once:
  `gcloud firestore fields ttls update expireAt --collection-group=visitBeacons --enable-ttl --database=<database>`.

## Revisit when

- Home visits pass about 2,000 a day. Then aggregate per day instead of reading every beacon.
- Ads target visitors outside India. Then revisit consent with ADR-0013.
