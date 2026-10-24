# ADR-0015: Take coupon codes at payment

- **Status:** Accepted
- **Date:** 2026-10-24
- **Deciders:** Sandeep (owner), Claude

## Context

A couple liked the preview and asked for a discount on WhatsApp. The price was fixed at ₹499, so the answer was no, and the couple left. Sandeep wants three things:

- A list price of ₹799, and coupon codes that take a percentage off it. A couple who asks for a discount then gets one.
- A record of the code each paid couple used. A couple who refers a friend gets a cashback, and the code is how the team knows who referred whom.
- A ribbon at the top of the home page that offers one code, such as "Use NEW20 for 20% off". The admin turns it on and off.

The payment is a public endpoint with no session ([ADR-0011](./0011-take-payment-with-cashfree-payment-links.md), [ADR-0012](./0012-add-razorpay-as-a-second-payment-provider.md)). The browser can send any value.

## Decision

We will take coupon codes on the preview's payment sheet, and price every order on the server.

- **Coupons** live in the `coupons` collection, under auto ids. Each has a code (3 to 20 capital letters and digits), a percentage off (1 to 90), an on/off switch, and a note for the admin. `createCoupon` checks inside a transaction that no other coupon has the code. A coupon is never deleted; the admin turns it off.
- **The admin** makes coupons and turns them on and off on `/admin` > Coupons. Every change writes the audit log.
- **The payment sheet** (`PublishBanner`) shows "Have a coupon code?" when payment is live. `applyCouponAction` checks a code and answers the new price. It is a read. It allows 20 tries per IP in 10 minutes, so nobody guesses a referral code by trying them all.
- **The pay button** sends the code, never a price. `publishAction` prices the order again with `quotePrice`, from the stored coupon. A code turned off meanwhile stops the payment with a sentence; the couple is never charged a price they did not see.
- **The record.** The `payments` document keeps the coupon. When the payment settles, the lead gets `coupon: { code, percentOff }`. "Make live without payment" takes an optional code too, on or off, so a couple who paid by UPI to the business number still counts. `/admin` > Coupons lists the paid leads for each code. The Telegram payment alert names the code.
- **The ribbon.** `siteContent/home-ribbon` names one coupon. The home page shows the ribbon only while that coupon is on. The payment sheet offers the same code in one tap. The read is cached for a minute and gives up after 1.5 seconds.
- **Google Ads** gets the amount the couple paid, after the coupon, as the purchase value.

## Alternatives considered

### Option A — percentage coupons, priced on the server (chosen)

One number per coupon is easy to explain on a ribbon and on WhatsApp. Pricing on the server means a changed page cannot lower the price.

### Option B — a flat amount off, or both kinds

A flat ₹100 off is clear too. Two kinds double the admin form and the price rules for no request today. We can add it later with a new field; a stored coupon without it stays a percentage.

### Option C — the price sent from the page

Simpler, and wrong: the pay action is public, so anybody could pay ₹1.

### Option D — Razorpay or Cashfree offers

Both providers have offers, but they apply inside their checkout, after the couple has chosen to pay. They also tie the record to one provider, and we run two.

## Consequences

**Good**

- The team can say yes to a discount, and the couple sees it applied.
- Each referral is on record, per code, for the cashback.
- The ribbon changes without a deploy.

**Bad**

- A public code is shared further than intended. The admin turns it off; the ribbon and the payment sheet stop offering it at once (the ribbon within a minute).
- One more public Server Action. It reads one document and is rate-limited per IP on each instance only.
- The list price rises from ₹499 to ₹799. A couple with no code pays more than before.

**Neutral**

- Leads before this change have no `coupon` field. They count as "no code".
- A test publish in development ignores the code, as it ignores the price.

## Revisit when

- A code is abused: add a use limit or an end date per coupon.
- Sandeep wants a flat amount off, or a code for one couple only.
- More than 200 coupons exist: `/admin` lists the first 200 only.

## References

- `lib/coupons.ts`, `services/coupon.service.ts`
- `app/(invite)/preview/[id]/actions.ts`: `applyCouponAction`, `publishAction`
- `app/(admin)/admin/coupons-view.tsx`
- `components/invite/CouponField.tsx`, `components/home/OfferRibbon.tsx`
