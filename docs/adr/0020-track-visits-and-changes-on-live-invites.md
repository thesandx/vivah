# ADR-0020: Track visits and the couple's changes on each live invite

- **Status:** Accepted
- **Date:** 2026-11-10
- **Deciders:** Sandeep (owner), Claude

## Context

After a couple pays, we cannot see if guests open their invite. We also cannot see what the couple changes from the dashboard. Sandeep asked for a tracker on each live invite in `/admin`: the total visits, and a log of the couple's changes. He asked for it in the admin panel only, not in the couple's dashboard.

## Decision

### Visits

We will count visits to a live invite with our own beacon, the same way as the home page ([ADR-0014](./0014-measure-home-page-visits-first-party.md)) and the preview ([ADR-0019](./0019-track-the-preview-page.md)). There is no third party and no cookie.

- `components/analytics/InviteVisitTracker.tsx` wraps a couple's invite. The sample invite is not measured.
- It sends one beacon when the page loads (`opened`), one when the guest taps the cover (`envelope-opened`), and one on each RSVP tap (`rsvp-tapped`).
- A beacon holds the wedding's id, a random tab id, the event, the device size, `guest` or `couple`, a "first time in this browser" flag, and the guest link's id when the guest came through one. The guest link id is the SHA-256 hash the link already has. A beacon holds no name, phone number, IP address or free text.
- The browser keeps one fixed word per invite in `localStorage`: `guest`, `couple` or `admin`. This tells a new visitor from a returning one. It is not a cookie and it is never sent to us.
- A link from `/admin` to the invite adds `#from-admin`. That browser then sends nothing for that invite again. A link from the couple's dashboard adds `#from-dashboard`. That browser then counts as `couple`, apart from the guests. The page removes the mark from the address at once, so a copied address never carries it.
- `POST /api/invite-visits` stores each beacon in `inviteBeacons`. It is a write with no session. Its limits match `POST /api/preview-visits`:
  - It creates one document, reads nothing back, and answers 204.
  - The body is a strict zod schema, at most 1 KB.
  - One IP may send 60 beacons in 10 minutes. The IP is not stored.
  - A crawler, a headless browser, or a request with the admin cookie is answered and not stored.
- Each beacon carries `expireAt`, 12 months after it was written. The privacy page says so.
- `/admin/invites/<id>` reads the invite's beacons by `weddingId` with a composite index, at most 5,000. It shows total visits, first-time visitors, cover taps, RSVP taps, devices, the couple's own visits, the visits per guest link, the last 14 days, and the guest links nobody opened yet.

### The couple's changes

- Each dashboard save that changes something writes one entry to `weddings/{id}/inviteChanges`: the dashboard area, and one line per field with the old and the new value. A save that changes nothing writes nothing.
- The areas are the details form, functions, families, song, and guest links (made or deleted).
- The entry is written after the save. A failed entry is logged and does not fail the couple's save.
- `/admin/invites/<id>` lists the newest 100 entries.
- Changes made from `/admin` are not in this log. They are in `adminAudit`.
- "Clear test data" ([ADR-0016](./0016-erase-test-data-from-admin.md)) erases the log with its invite.

## Alternatives considered

### Option A — our own beacon and a change log (chosen)

It ties each visit to one invite, it keeps the privacy promise with no banner, and it reuses the home page and preview designs.

### Option B — a counter on the wedding document

Rejected: a busy invite gets more than one write per second when a family group opens it at once. A counter also cannot tell new visitors, guest links or days apart.

### Option C — Google Analytics or Microsoft Clarity on the invite

Rejected: cookies, a banner, and a third party on a page that the couple's guests open.

### Option D — find the admin by the admin cookie only

Not enough: the admin cookie belongs to `vivah.online`, so the browser does not send it to `<slug>.vivah.online`. The `#from-admin` mark covers that. The route still checks the cookie for local development, where the invite is on the same host.

## Consequences

**Good**

- Sandeep sees how many guests opened each invite, and through which guest link.
- He sees what the couple changed and when, without asking them.

**Bad**

- A fourth anonymous write route. A made-up wedding id stores a beacon that no invite reads. Add a Cloudflare WAF rule on `/api/invite-visits` if abuse appears.
- A visit is "new" per browser. One guest on a phone and a computer counts twice. A private window, or a browser with storage blocked, counts every visit as new.
- The admin's browser is quiet only after it opens the invite from `/admin` once. Open the invite from `/admin` before checking it by hand.
- `expireAt` removes nothing until a Firestore TTL policy is on. A human turns it on once:
  `gcloud firestore fields ttls update expireAt --collection-group=inviteBeacons --enable-ttl --database=<database>`.

## Revisit when

- One invite passes about 5,000 beacons. Then keep a count per day instead of reading every beacon.
- The couple asks to see their own visits. Then show the same card in the dashboard.
