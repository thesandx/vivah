# Architecture Decision Records

An ADR captures **one** significant decision: the context that forced it, what was chosen, and what it costs. Months later, when someone asks "why is it done this way?", the ADR answers instead of git blame.

## When to write one

Write an ADR when a decision:

- is expensive to reverse (a database, a framework, an auth model)
- affects how the whole team works (folder structure, a testing strategy)
- rejects an obvious alternative (and someone will later ask why)
- will outlive the people who made it

Do **not** write one for a routine choice with an obvious answer. An ADR per pull request devalues the ones that matter.

## How

1. Copy [`0000-template.md`](./0000-template.md).
2. Number it sequentially: `0005-use-cloud-sql-for-persistence.md`.
3. Write it in the PR that makes the change, not afterwards.
4. Never edit an accepted ADR to change its decision. Write a new one that supersedes it and link both ways. The record of the earlier decision is the valuable part.

## Status values

| Status                 | Meaning                                |
| ---------------------- | -------------------------------------- |
| Proposed               | Under discussion; not yet acted on     |
| Accepted               | Decided and in effect                  |
| Deprecated             | No longer applies, nothing replaced it |
| Superseded by ADR-NNNN | Replaced by a later decision           |

## Index

| ADR                                                           | Title                                                                 | Status   |
| ------------------------------------------------------------- | --------------------------------------------------------------------- | -------- |
| [0001](./0001-use-cloud-run-for-hosting.md)                   | Use Cloud Run for hosting                                             | Accepted |
| [0002](./0002-use-workload-identity-federation.md)            | Use Workload Identity Federation instead of service account keys      | Accepted |
| [0003](./0003-scope-workload-identity-to-the-github-owner.md) | Scope the WIF provider to the GitHub owner                            | Accepted |
| [0004](./0004-use-firestore-and-cloud-storage.md)             | Use Firestore and Cloud Storage for data and files                    | Accepted |
| [0006](./0006-accept-anonymous-lead-capture.md)               | Accept one anonymous write, for lead capture                          | Accepted |
| [0007](./0007-publish-from-the-bound-preview-browser.md)      | Publish an invite from the bound preview browser, with a test payment | Amended  |
| [0008](./0008-two-step-admin-sign-in.md)                      | Sign in to the admin dashboard in two steps, with its own session     | Accepted |
| [0009](./0009-open-a-preview-in-two-browsers.md)              | Open a preview in two browsers, then lock it                          | Amended  |
| [0010](./0010-open-a-preview-to-anyone-for-30-minutes.md)     | Open a preview to anyone with the link, for 30 minutes                | Accepted |
| [0011](./0011-take-payment-with-cashfree-payment-links.md)    | Take payment with Cashfree Payment Links                              | Amended  |
| [0012](./0012-add-razorpay-as-a-second-payment-provider.md)   | Add Razorpay Standard Checkout as a second payment provider           | Accepted |
| [0013](./0013-measure-google-ads-conversions.md)              | Measure Google Ads conversions                                        | Accepted |
| [0014](./0014-measure-home-page-visits-first-party.md)        | Measure home page visits with our own beacon                          | Accepted |
| [0015](./0015-take-coupon-codes-at-payment.md)                | Take coupon codes at payment, priced on the server                    | Accepted |
| [0016](./0016-erase-test-data-from-admin.md)                  | Erase test data from the admin dashboard                              | Accepted |
