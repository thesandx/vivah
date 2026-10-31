# ADR-0019: Track what couples do on their preview

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** Sandeep (owner), Claude

## Context

On 28 and 29 Oct 2026, 130 home page visits made 39 previews, and 1 couple paid. The home page tracker ([ADR-0014](./0014-measure-home-page-visits-first-party.md)) stops when the preview opens. So we cannot see where couples stop on the preview. Do they open the invite? Do they reach the pay sheet? Do they open Razorpay's window and close it?

Sandeep asked for a tracker for each preview and over all previews. He also asked to tag each lead New, Hot, Cold or Test, and to filter the Previews list by tag.

## Decision

We will measure the unpaid preview page with our own beacon, the same way as the home page. There is no third party and no cookie.

- `components/analytics/PreviewTracker.tsx` wraps the preview page. It counts the time each `data-preview-section` of the invite holds the middle of the screen. Components record events with `usePreviewTracking().track`: invite opened, date scratched, pay sheet opened, coupon applied or refused, WhatsApp chat or "Share with family" tapped on the pay sheet, pay tapped, payment window opened, closed or failed, and paid. The "preview has closed" page records that it was seen, and its WhatsApp button records a tap.
- A beacon goes when the tab is hidden or left. A payment step sends one at once, because Razorpay's window or a redirect may follow.
- A beacon holds the preview's id, a random tab id that lives only in memory, fixed ids from `lib/preview-tracking.ts`, numbers, and whether the browser is one the preview is bound to (`couple`) or another one (`other`). It holds no name, phone number, IP address or free text.
- `POST /api/preview-visits` stores each beacon in `previewBeacons`. It is a write with no session. Its limits match `POST /api/visits`:
  - It creates one document, reads nothing back, and answers 204.
  - The body is a strict zod schema, at most 4 KB.
  - One IP may send 60 beacons in 10 minutes. The IP is not stored.
  - A crawler, a headless browser, or a browser with the admin cookie is answered and not stored.
- `/admin/previews/<id>` shows one preview's activity. It reads the beacons by `leadId` with a composite index. The Previews list shows how far each preview of the last 30 days got. `/admin` > Preview tracker shows the funnel over a range. It leaves out deleted previews, previews tagged Test, and ids that are not a preview. Payments come from `leads`, so a payment in another browser still counts.
- A paid preview is not measured.
- The lead gets an optional `tag`: `new`, `hot`, `cold` or `test`. Absent means `new`. A `new` lead made more than 24 hours ago shows as Old in `/admin`, and the Previews list can filter on Old. Old is never stored, so a manual tag always wins. The admin sets it on `/admin/previews/<id>`, and the audit log records each change. The Previews list filters on it in memory.
- Each beacon carries `expireAt`, 12 months after it was written. The privacy page says so.

## Alternatives considered

### Option A — our own beacon (chosen)

It ties each step to one preview, so Sandeep can follow up with the right couple. It reuses the home page design, and it keeps the privacy promise with no banner.

### Option B — send the steps through the existing `POST /api/visits`

Rejected: a home page beacon is not tied to a person, and the preview one is. Two routes keep the two promises apart in the code and on the privacy page.

### Option C — Microsoft Clarity on the preview

Rejected for the same reasons as in ADR-0014: cookies, a banner, and a third party on the page where the couple pays.

## Consequences

**Good**

- Sandeep sees where each couple stopped, and the funnel over all previews, in `/admin`.
- He can follow up with a couple who closed the payment window, with the right message.

**Bad**

- A third anonymous write route. A made-up preview id stores a beacon that no report reads. Add a Cloudflare WAF rule on `/api/preview-visits` if abuse appears.
- Unlike the home page data, a beacon is tied to a preview, so to a couple. The privacy page says so.
- The funnel reads at most 6,000 beacons per range, and one preview's card at most 400.
- `expireAt` removes nothing until a Firestore TTL policy is on. A human turns it on once:
  `gcloud firestore fields ttls update expireAt --collection-group=previewBeacons --enable-ttl --database=<database>`.

## Revisit when

- Previews pass about 300 a day. Then aggregate per day instead of reading every beacon.
- A Premium checkout or another payment flow is added. Then add its steps to the event list.
