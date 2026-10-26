# ADR-0018: Keep the admin signed in until sign-out

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Sandeep (owner), Claude
- **Supersedes in part:** [ADR-0008](./0008-two-step-admin-sign-in.md) (the 12-hour session and the strict cookie)

## Context

ADR-0008 gives an active admin session 12 hours. The `vivah_admin` cookie is `SameSite=Strict`.

On an iPhone, the admin was signed out again and again. Two causes added up:

- **The 12-hour limit.** The admin opens `/admin` many times a day from the same phone. Each new day needs Google and an OTP again.
- **The strict cookie.** The Telegram alert links to `/admin/previews/<id>`. A tap opens Safari from another app. Safari does not send a strict cookie with that navigation. So the page showed the sign-in screen, although the session was still valid.

Sandeep wants the admin to stay signed in until he signs out.

## Decision

- **A sliding session.** An active session ends after 90 days with no visit to `/admin`. Each visit moves the end to 90 days from now. The server writes the new end at most once a day. A failed write is logged and does not sign the admin out.
- **The server decides the end.** The active cookie has a lifetime of 400 days, the longest Chrome keeps. The session in `adminSessions` ends first. Safari caps the lifetime of cookies that script writes; the server sets this cookie, so the cap does not apply.
- **`SameSite=Lax`.** The cookie now goes with a top-level GET from another app or site, such as the Telegram link. It does not go with a cross-site POST. Every admin change is a Server Action, which is a POST, and Next.js also checks its `Origin`.
- **No change to the sign-in.** Google, then an OTP, as in ADR-0008. The pending step still lasts 10 minutes. Sign-out still ends the session at once.

## Consequences

- The admin signs in again only after sign-out, or after 90 days away.
- A stolen phone that is unlocked opens `/admin` for longer. The control is the phone lock and sign-out. To end every session, soft-delete the documents in `adminSessions`.
- A link from another site can open an admin page in a signed-in browser. It can only read the page, and only the admin sees it. It cannot change anything.

## Alternatives considered

- **A longer fixed session, such as 30 days.** Rejected: the admin still signs in again at a time he does not choose.
- **Keep `Strict` and add a "Continue" step.** Rejected: one more tap on every alert, for no gain, because no admin change is a GET.
