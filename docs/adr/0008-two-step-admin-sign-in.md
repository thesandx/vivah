# ADR-0008: Sign in to the admin dashboard in two steps, with its own session

- **Status:** Accepted
- **Date:** 2026-10-15
- **Deciders:** Sandeep
- **Superseded in part by:** [ADR-0018](./0018-keep-the-admin-signed-in-until-sign-out.md) (the session length and the cookie's `SameSite`)

## Context

The admin dashboard changes every couple's invite. It edits, pauses, moves and deletes invites, and it reactivates previews. A stolen admin login can break every wedding at once.

Until now an admin was any session whose phone number was in `ADMIN_PHONE_NUMBERS`, at `/dashboard/admin`. One factor opened it: the OTP. That number is also the public business WhatsApp number.

The product owner asked for a dashboard at `/admin` with two steps: Google with one account, then an OTP to one phone.

Firebase multi-factor authentication needs an upgrade to Identity Platform and an enrolment flow. It also changes how every sign-in for that account works, including the couple dashboard.

## Decision

The admin signs in twice, with two separate Firebase sign-ins. The server joins them.

- **Step 1, Google.** The browser posts the Google ID token to `POST /api/admin/session`. The server verifies it and checks the provider is `google.com`, the email is verified, and it equals `ADMIN_EMAIL`. It then opens a PENDING session for 10 minutes and sets the `vivah_admin` cookie.
- **Step 2, OTP.** The browser signs in by phone to `ADMIN_PHONE` and posts that ID token. The server checks the pending session in the cookie, the provider `phone`, the number, and that the OTP was entered within 10 minutes. It then ends the pending session and opens an ACTIVE session for 12 hours under a NEW token.
- **Its own session.** `vivah_admin` is separate from `__session`, so the couple dashboard is not affected. Firestore keeps the SHA-256 of the token in `adminSessions`, never the token. Sign-out soft-deletes the session.
- **`requireAdmin()` is the gate.** It is the first line of every admin Server Action. It replaces `requireUser()` for these writes, because the admin session is stronger than a Firebase session.
- **An audit log.** Every admin change writes one `adminAudit` document. Changes inside a transaction write the entry in the same transaction.
- **Hidden, not secret.** Nothing on the site links to `/admin`, and it sends `noindex`. It is not in `robots.txt`, because that file would announce it. The control is the two steps.
- **Off unless configured.** If `ADMIN_EMAIL` or `ADMIN_PHONE` is unset, `/admin` answers 404. The email is a GitHub variable, not in the repository, because the repository is public.
- `/dashboard/admin` is removed. An admin phone number alone no longer edits any invite from `/dashboard`.

## Consequences

- Google must be enabled in Firebase, and `vivah.online` must be an authorised domain.
- A pending or ended session stays as a soft-deleted document. The volume is a few per day. A Firestore TTL policy on `expiresAt` can remove them later.
- One admin account. A second admin needs a list in place of `ADMIN_EMAIL`, and a phone per email.
- Deleting an invite frees its address: it deletes the `slugClaims` document permanently. A claim is a lock, not data. The wedding itself stays soft-deleted, and a restore claims a free address again.
