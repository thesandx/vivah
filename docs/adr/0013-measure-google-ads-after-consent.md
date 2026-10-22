# ADR-0013: Measure Google Ads conversions only after consent

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** Sandeep (owner), Claude

## Context

We plan to buy Google Search ads. The plan allows spend only when Google Ads can count each purchase. Without that count, Google cannot tell a good keyword from a bad one, and we cannot compute the cost per sale.

The site had no Google tag. The privacy page promised: "We do not use advertising or analytics cookies today. If we add them, we will ask you first."

The funnel crosses browsers. A couple often clicks the ad in Chrome, signs up there, and then pays in the WhatsApp link, which opens in another browser. A tag in the paying browser has no record of the ad click.

## Decision

We will add the Google tag for conversions only, in Google's basic consent mode:

- A banner on the product site asks "Accept" or "No thanks". The answer stays in `localStorage`.
- Google's script (`gtag.js`) is not requested until the visitor presses "Accept". Before that, no cookie is set and nothing goes to Google.
- Consent covers ad storage and ad user data only. Ad personalisation (remarketing) and analytics stay denied.
- Two conversions are sent: "Preview made" when the sign-up card creates a preview, and "Purchase" on the payment-success screen. The purchase carries the amount and the payment id as `transaction_id`, so a refresh does not count twice.
- The preview page loads the tag but shows no banner, because a banner there covers the pay button. A purchase there counts only when the visitor accepted earlier in that browser.
- With consent, the sign-up card sends the ad's click id (`gclid`) with the lead. It is stored on the lead. A payment made in another browser can then be matched to the ad by an upload in Google Ads (Goals > Uploads).
- Guest invite pages get no tag.
- The conversion id and labels are `NEXT_PUBLIC_*` build arguments. Without the id, the site has no tag and no banner.

## Alternatives considered

### Option A — basic consent mode, tag after "Accept" (chosen)

It keeps the promise on the privacy page literally: nothing loads before the visitor agrees. It needs no consent platform and no new dependency.

### Option B — advanced consent mode

The tag loads at once and sends cookieless pings while consent is denied. Google then models the missing conversions. It recovers more data. But Google's code runs and contacts Google before the visitor answers, which is not what the privacy page promises.

### Option C — server-side conversions only (Google Ads API)

The server would upload each paid lead's `gclid`. It counts payments in every browser and needs no banner for the upload. But it needs a Google Ads API developer token, which Google approves by application, and an OAuth refresh token stored as a secret. It is a good second step, not the first. The stored `gclid` keeps that step open.

## Consequences

**Good**

- Google Ads can optimise on real purchases, with the real amount.
- The privacy promise holds: no consent, no Google code.
- No new npm dependency. `next/script` loads Google's library.

**Bad**

- Visitors who press "No thanks" or ignore the banner are not counted. Reports undercount.
- A payment in another browser is counted only after a manual upload of the `gclid`.
- The banner covers part of the screen until the visitor answers.

**Neutral**

- The lead gains an optional `gclid` field. Nothing queries it, so it needs no index.

## Revisit when

- Purchases per month pass about 50. Then automate the `gclid` upload through the Google Ads API (Option C).
- We add analytics (GA4) or another ad platform. Each needs its own consent purpose in the banner.

## References

- [Google: consent mode overview](https://support.google.com/google-ads/answer/10000067)
- [Google: set up conversions with the Google tag](https://support.google.com/google-ads/answer/12216226)
- `components/ads/GoogleAdsProvider.tsx`, `lib/google-ads.ts`
