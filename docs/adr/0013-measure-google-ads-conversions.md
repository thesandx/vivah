# ADR-0013: Measure Google Ads conversions with the Google tag

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** Sandeep (owner), Claude

## Context

We plan to buy Google Search ads. The plan allows spend only when Google Ads can count each purchase. Without that count, Google cannot tell a good keyword from a bad one, and we cannot compute the cost per sale.

The site had no Google tag.

The funnel crosses browsers. A couple often clicks the ad in Chrome, signs up there, and then pays in the WhatsApp link, which opens in another browser. A tag in the paying browser has no record of the ad click.

## Decision

We will add the Google tag for conversions only, with no cookie banner:

- The tag loads on the product site and on the preview page. Guest invite pages get no tag.
- Ad personalisation (remarketing) and analytics stay denied in Google's consent settings. The tag only counts conversions.
- Two conversions are sent: "Preview made" when the sign-up card creates a preview, and "Purchase" on the payment-success screen. The purchase carries the amount and the payment id as `transaction_id`, so a refresh does not count twice.
- The sign-up card sends the ad's click id (`gclid`) with the lead. It is stored on the lead. A payment made in another browser can then be matched to the ad by an upload in Google Ads (Goals > Uploads).
- The privacy page names the Google Ads cookie and the click id.
- The conversion id and labels are `NEXT_PUBLIC_*` build arguments. Without the id, the site has no tag.

## Alternatives considered

### Option A — the tag on every visit, no banner (chosen)

Sandeep decided on 2026-10-22 that Indian law does not require a cookie banner for this use, and that a banner costs attention on a phone. The tag then counts every visitor, so the reports do not undercount.

### Option B — a consent banner, tag after "Accept"

The first version of this PR did this, in Google's basic consent mode. It loads nothing before the visitor agrees. It was dropped at Sandeep's request: it undercounts, and it adds a banner to every first visit.

### Option C — server-side conversions only (Google Ads API)

The server would upload each paid lead's `gclid`. It counts payments in every browser. But it needs a Google Ads API developer token, which Google approves by application, and an OAuth refresh token stored as a secret. It is a good second step, not the first. The stored `gclid` keeps that step open.

## Consequences

**Good**

- Google Ads can optimise on real purchases, with the real amount.
- Every visit from an ad is counted.
- No new npm dependency. `next/script` loads Google's library.

**Bad**

- Google's script loads on every product-site visit and adds a cookie.
- Visitors from the EU or the UK would expect a consent choice. If we target ads outside India, this needs a new decision.
- A payment in another browser is counted only after a manual upload of the `gclid`.

**Neutral**

- The lead gains an optional `gclid` field. Nothing queries it, so it needs no index.

## Revisit when

- Purchases per month pass about 50. Then automate the `gclid` upload through the Google Ads API (Option C).
- We run ads outside India, or India's DPDP rules start to cover cookies. Then add a consent banner (Option B).
- We add analytics (GA4) or another ad platform. ([ADR-0017](./0017-measure-meta-ads-conversions.md) adds the Meta Pixel on the same terms.)

## References

- [Google: set up conversions with the Google tag](https://support.google.com/google-ads/answer/12216226)
- `components/ads/GoogleAdsProvider.tsx`, `lib/google-ads.ts`
