# ADR-0006: Accept one anonymous write, for lead capture

- **Status:** Accepted. Amended by [ADR-0009](./0009-open-a-preview-in-two-browsers.md): a preview now binds two browsers.
- **Date:** 2026-10-14
- **Deciders:** Sandeep

## Context

[ADR-0005](./0005-use-firebase-auth-for-sign-in.md) makes every write need a session: a route that changes data calls `requireUser()` first.

The product funnel starts before any account exists. A couple types two names, a date and a WhatsApp number on the home page. The app saves a lead and gives them a private preview. They pay, and then they sign in with WhatsApp OTP to manage their invite. Asking for an OTP before the preview adds a step, and an SMS cost, to every visitor. Most visitors do not pay.

## Decision

`POST /api/leads` accepts a request with no session. It is the only write route that does.

The route is narrow, so the exception stays small:

- It creates one `leads` document. It reads nothing back, and it changes no existing document.
- The body is a strict zod schema (`lib/lead-schema.ts`). An unknown key fails the request, so a caller cannot set `status`, the token hash or any other stored field.
- A hidden honeypot field catches simple bots. The route answers as if it succeeded and stores nothing.
- The answer is the lead's preview path. The lead id is a Firestore auto id (about 119 random bits), so a preview cannot be guessed.
- The preview binds to the first browser that opens it (`GET /p/<id>` sets a cookie, the lead stores its SHA-256 hash). A forwarded link does not show the preview.
- The phone number is stored and never logged.

## Consequences

- Anyone can create leads. That costs a Firestore write each, and it fills the collection with junk. If abuse appears, add a rate limit at Cloudflare (a WAF rule on `/api/leads`) before you add code.
- Leads that never convert stay until a cleanup removes them. The PRD says 30 days. Add a Firestore TTL policy on `expiresAt`, or a scheduled job, before launch.
- Every other write route keeps `requireUser()`. A new anonymous write needs its own ADR.

## Alternatives considered

**OTP before the preview.** It gives a verified number at once. Rejected: it puts the most expensive and slowest step in front of every visitor, before they have seen anything.

**A reCAPTCHA or Turnstile check on the form.** Stronger against bots. Deferred: it adds a script to the first page. Add Cloudflare Turnstile if the honeypot and a WAF rule are not enough.
