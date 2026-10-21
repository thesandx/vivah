# ADR-0012: Add Razorpay Standard Checkout as a second payment provider

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Sandeep
- **Amends:** [ADR-0011](./0011-take-payment-with-cashfree-payment-links.md): the provider is a choice, not always Cashfree

## Context

Cashfree is the payment provider ([ADR-0011](./0011-take-payment-with-cashfree-payment-links.md)). Its live account does not yet allow the Payment Link creation API, so couples cannot pay. The product owner opened a Razorpay account as a backup, and its KYC is approved (2026-10-21).

The product owner wants the couple to stay on vivah.online while they pay (2026-10-21).

## Decision

- **Razorpay Standard Checkout.** The pay button's Server Action creates a `payments` document and a Razorpay order (`POST /v1/orders`) with the receipt `vivah_<payment id>`. The page loads `checkout.js` and opens Razorpay's checkout over itself. The couple never leaves the site.
- **Razorpay's own record decides.** `completePayment` reads the order from `GET /v1/orders/<order id>`. It publishes only when the status is `paid` and the amount paid, in INR, is at least the price.
- **Two triggers, one outcome.** After a payment, the checkout hands the page a payment id and a signature. The page posts them to `POST /api/payments/razorpay/confirm`. That route checks the signature (hex HMAC-SHA256 of `<order id>|<payment id>` with the key secret), then settles the payment and answers where the page goes next. The webhook `POST /api/payments/razorpay` (`order.paid`) does the same for a couple who closes the tab first. It checks `x-razorpay-signature` on the raw body with the webhook secret.
- **One switch.** `PAYMENT_PROVIDER` is `auto` (default), `cashfree` or `razorpay`. `auto` uses Cashfree when its keys are set, else Razorpay. A named provider without keys turns payment off. It never falls back silently.
- **Each payment remembers its provider.** A `payments` document stores `provider` (absent on older documents means Cashfree) and Razorpay's `order_` id. A payment started before a switch settles with the provider that holds it. Both providers' routes answer while their keys are set.
- **The mode comes from the key.** A key id that starts `rzp_live_` is the live account; `rzp_test_` is test mode. There is no separate environment variable to get out of step with the key.
- **No npm package.** The two API calls use `fetch`, as the Cashfree calls do. The browser loads `checkout.js` only when a couple taps Pay.

## Consequences

- Two more routes change data without a session: the confirm route and the webhook. Each acts only on what Razorpay's API reports.
- The preview page loads a third-party script from `checkout.razorpay.com` when a couple taps Pay. A Content Security Policy added later must allow it and Razorpay's frames.
- Three more settings: `RAZORPAY_KEY_ID` (a GitHub variable), and the key secret and webhook secret (Secret Manager). See `cloud/environment-variables.md > Razorpay configuration`.
- The webhook URL is set by hand in Razorpay's dashboard. Without it, a couple who closes the tab after paying is settled only when someone reads the order again.
- The Cloudflare rules that skip the challenge for `/api/payments` also cover the Razorpay routes.

## Alternatives considered

**Razorpay Payment Links.** The first version of this change used them, as Cashfree does. Rejected: the couple leaves the site for Razorpay's page, and the product owner wants them to stay.

**Replace Cashfree.** Rejected: Cashfree's 0% fee offer is better once its API is enabled. The switch lets the product owner move back without a code change.
