# ADR-0012: Add Razorpay Payment Links as a second payment provider

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Sandeep
- **Amends:** [ADR-0011](./0011-take-payment-with-cashfree-payment-links.md): the provider is a choice, not always Cashfree

## Context

Cashfree is the payment provider ([ADR-0011](./0011-take-payment-with-cashfree-payment-links.md)). Its live account does not yet allow the Payment Link creation API, so couples cannot pay. The product owner opened a Razorpay account as a backup, and its KYC is approved (2026-10-21).

## Decision

- **The same design, a second provider.** Razorpay gets one Payment Link per payment, as Cashfree does. The link's `reference_id` is `vivah_<payment id>`, the Cashfree link id. The couple opens Razorpay's page and comes back to `GET /api/payments/razorpay/return`. Razorpay posts `POST /api/payments/razorpay`.
- **Razorpay's own record decides.** `completePayment` reads the link from `GET /v1/payment_links/<plink id>`. It publishes only when the status is `paid` and the amount paid, in INR, is at least the price. The webhook and the return only name the payment.
- **The webhook checks the signature first.** `x-razorpay-signature` is the hex HMAC-SHA256 of the raw body with the webhook secret. The secret is set in Razorpay's dashboard, with the webhook URL. It is a different secret from the API key secret.
- **One switch.** `PAYMENT_PROVIDER` is `auto` (default), `cashfree` or `razorpay`. `auto` uses Cashfree when its keys are set, else Razorpay. A named provider without keys turns payment off. It never falls back silently.
- **Each payment remembers its provider.** A `payments` document stores `provider` (absent on older documents means Cashfree) and Razorpay's `plink_` id. A payment started before a switch settles with the provider that holds its link. Both providers' routes answer while their keys are set.
- **The mode comes from the key.** A key id that starts `rzp_live_` is the live account; `rzp_test_` is test mode. There is no separate environment variable to get out of step with the key.

## Consequences

- Two more routes change data without a session: the Razorpay webhook and return. Each acts only on what Razorpay's API reports.
- Three more settings: `RAZORPAY_KEY_ID` (a GitHub variable), and the key secret and webhook secret (Secret Manager). See `cloud/environment-variables.md > Razorpay configuration`.
- The webhook URL must be added in Razorpay's dashboard by hand. Without it, a couple who closes the tab before the return is settled only when they open the preview again.
- The Cloudflare rules that skip the challenge for `/api/payments` also cover the Razorpay routes.

## Alternatives considered

**Razorpay Standard Checkout (Orders API and `checkout.js`).** Razorpay's own guide suggests it. It keeps the couple on our page. Rejected for now: it adds a third-party script and an npm package, and it would make the two providers behave differently. A payment link needs neither.

**Replace Cashfree.** Rejected: Cashfree's 0% fee offer is better once its API is enabled. The switch lets the product owner move back without a code change.
