# ADR-0011: Take payment with Cashfree Payment Links, and publish from Cashfree's own record

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** Sandeep
- **Supersedes:** the test payment in [ADR-0007](./0007-publish-from-the-bound-preview-browser.md), in production
- **Amends:** [ADR-0009](./0009-open-a-preview-in-two-browsers.md): the browser binding no longer decides who may pay

## Context

[ADR-0007](./0007-publish-from-the-bound-preview-browser.md) publishes an invite from a test payment button that takes no money. The product owner chose Cashfree as the payment gateway (2026-10-14). The Cashfree account is now active.

A payment arrives in two ways: the couple's browser comes back from Cashfree's page, and Cashfree posts a webhook. Neither has a session. Either one can arrive first, twice, or not at all.

## Decision

- **One Cashfree Payment Link per payment.** The pay button calls the preview page's Server Action. The action checks the lead and the address, creates a `payments` document, and creates a link with the id `vivah_<payment id>`. The browser opens the link's page. Nothing is reserved yet.
- **Cashfree's own record decides.** `completePayment` reads the link from Cashfree's API (`GET /pg/links/<id>`). It publishes only when the status is `PAID` and the amount paid is at least the price, in INR. A webhook body and a return URL only name the link. A forged or replayed one publishes nothing.
- **Two triggers, one outcome.** `GET /api/payments/cashfree/return` settles the payment and sends the couple to their live invite. `POST /api/payments/cashfree` (the webhook) does the same when the couple closes the tab. The webhook checks Cashfree's signature on the raw body first. Both run one transaction, so the second finds the work done.
- **The same writes as before.** The transaction creates the wedding, the `slugClaims` lock and marks the lead paid (`writePublish`), as in ADR-0007. It also marks the payment paid.
- **Paid, but the address went first.** If another couple published the address while this couple paid, the lead is marked paid without an address. The preview page asks for another address, and the couple publishes with nothing more to pay.
- **A second payment** for a lead that is already paid is kept with `outcome: 'duplicate'` and a Telegram notice, for a refund by hand.
- **Any browser may pay.** The money is the proof, so the pay banner shows in every browser that can see the preview. This fixes a couple who opens the link on a third phone and finds no pay button.
- **A paid link outlives the preview.** Links stay open for one hour. A payment that completes after the preview's 30 minutes still publishes.
- **The test payment stays for development only.** Without Cashfree keys, development publishes free from the bound browser (ADR-0007). Production without keys shows "Payment is not open right now". It never publishes free.

The secret key lives in Secret Manager. `CASHFREE_ENV` selects the sandbox or the live account. See `cloud/environment-variables.md > Cashfree configuration`.

## Consequences

- Two more routes change data without a session: the webhook and the return. Each acts only on what Cashfree's API reports.
- A new collection, `payments`. It is the order record for refunds and for ad conversions later: lead id, amount, Cashfree order id and the time paid.
- An outage at Cashfree stops new payments. A payment Cashfree takes during our outage is settled by the webhook's retries.
- A sandbox key on the live site lets anyone "pay" with test credentials. Keep the sandbox phase short.

## Alternatives considered

**Cashfree's in-page checkout (Orders API and the JS SDK).** It keeps the couple on our page. Rejected for now: it adds a third-party script to the page, and the live account must whitelist each domain first. A payment link needs neither.

**Trust the webhook body.** Simpler, one call fewer. Rejected: the API read makes a replayed or forged body harmless, and it also covers the return path, which has no signature.

**Reserve the address while the couple pays.** It removes the "paid, but the address went first" case. Rejected: a hold needs an expiry and a cleanup, and it blocks the address for others while a couple only looks at Cashfree's page. The race is rare, and the fallback costs the couple one more tap.
