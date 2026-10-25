# Authentication

How a person signs in, how the server knows who they are, and what to do when it fails.

The decision and its alternatives are in [ADR-0005](./adr/0005-use-firebase-auth-for-sign-in.md). This page is the practical guide.

---

## What you get

Two ways to sign in, both through Firebase Auth:

| Method    | Good for                            | Costs                                                              |
| --------- | ----------------------------------- | ------------------------------------------------------------------ |
| Google    | `/admin` only, as its first step    | Free                                                               |
| Phone OTP | `/sign-in` and the couple dashboard | Real money per SMS — read [SMS fraud](#sms-fraud-is-the-real-risk) |

Reads are public. Writes need a session. Nothing else changes.

---

## The flow

```
1. Browser signs in with Firebase        → an ID token, valid one hour
2. POST /api/auth/session { idToken }    → server verifies it
3. Server sets an httpOnly cookie        → a session, valid up to 14 days
4. Every later request carries it        → getCurrentUser() on the server
```

**Step 2 happens once.** The ID token is spent and discarded. It is never put in `localStorage`, and the session cookie is `httpOnly`, so page script cannot read either one. A session that script can read is a session an XSS can steal.

**Why a session cookie and not the ID token.** An ID token expires after an hour. Storing it means any page loaded after that renders signed-out until the client notices and posts a fresh one. A session cookie removes that whole class of flicker. It costs one IAM role — see [The one broad role](#the-one-broad-role).

---

## Using it

### On the server

```ts
import { getCurrentUser, requireUser } from '@/services/auth.service';

// A page that adapts to who is asking. `null` when signed out.
const user = await getCurrentUser();

// A route that requires a session. Throws UnauthenticatedError, which
// lib/http-errors.ts maps to 401 — no special case in the handler.
const user = await requireUser();
```

That is the whole gate. One line per protected route.

`getCurrentUser` reads cookies, so any page that calls it is rendered on demand. That is correct for content that depends on the reader, but it does mean the page is never static.

### Ownership

A session says **who**, not **what they may touch**. Those are different checks, and only the first is automatic:

```ts
const document = await examples.getOrThrow(id);
if (document.ownerId !== user.uid) throw new ForbiddenError();
```

Write `ownerId` from the session, never from the request body. A body field named `ownerId` is a field the caller chooses.

### On the client

```tsx
import { SignInPanel } from '@/components/auth/SignInPanel';
import { SignOutButton } from '@/components/auth/SignOutButton';
```

`hooks/useFirebaseAuth.ts` holds the SDK calls. Nothing else should import `firebase/auth` directly.

### The sign-in screen

`/sign-in` behaves like a native app screen. It has an on-screen back arrow, so the user does not need the browser's back button. The phone flow has two steps on one route:

1. **Phone number.** The country code is a separate, prefilled choice. The user types only the national number. `lib/phone.ts` joins the two into E.164 and checks the digit count before any SMS is sent.
2. **OTP.** The screen shows the number the OTP went to. Six digits verify at once. "Resend OTP" unlocks after 30 seconds, because each SMS costs money.

The back arrow on the OTP step returns to the phone step and keeps the number, so the user can correct it.

To change the prefilled country, edit `DEFAULT_DIAL_COUNTRY` in `lib/phone.ts`. Keep `DIAL_COUNTRIES` the same as the SMS region policy in the console. A country that the policy blocks fails only after the user types the number.

Hiding a form from a signed-out user is a courtesy, not a control. The control is `requireUser()` on the server.

---

### The anonymous writes

`POST /api/leads` creates a lead with no session. It is the first step of the funnel, before the couple has an account. [ADR-0006](./adr/0006-accept-anonymous-lead-capture.md) records why, and the limits that keep it narrow: it creates one document, the body schema is strict, and a honeypot catches simple bots.

Step 3 of the sign-up card asks which functions the couple has besides the wedding: tilak, haldi, mehndi, sangeet and reception. The couple can tick any number, or none. `POST /api/leads` stores the kinds on the lead as `functions`. Publishing copies them onto the wedding with no date, time or venue. The couple adds those in `/dashboard`. The dashboard action calls `requireUser()` and checks that the session's number owns the wedding. The invite shows a "Wedding Festivities" timeline only when at least one function is chosen. The cards include the wedding and sort by date, then time. An admin edits the functions in `/admin`.

The couple chooses the invite address on step 4 of the sign-up card. `GET /api/addresses` offers free addresses and checks a typed one. It is a read, so it needs no session. `POST /api/leads` checks the address again and stores it on the lead as `desiredSlug`. That is a wish, not a reservation. Publishing reserves it. If another couple publishes it first, the preview page offers other addresses.

Step 5 asks for a song, from the four an admin uploads in `/admin`. `GET /api/songs` lists them, and `GET /api/songs/<file>` redirects to a short-lived signed URL. The body names the song by slot only. `POST /api/leads` copies the song's name and file onto the lead, and publishing copies them onto the wedding. Playing a song also chooses it. Later, the couple can change the song in `/dashboard`. The dashboard action calls `requireUser()`, checks that the session's number owns the wedding, and copies the song from the admin's list by slot.

The sign-up card does not ask whose name comes first. The bride's name comes first by default. The couple changes the order in `/dashboard` > "Your details". The save goes through the same action as the other details, so it calls `requireUser()` and checks ownership. An admin changes the order on `/admin/previews/<id>`, which also changes the live invite, or on `/admin/invites/<id>`. The lead and the wedding store it as `nameOrder`. The address never changes with it, so links already shared keep working. `lib/couple-names.ts` holds the rule, and every page and message reads the names through it.

The preview link `GET /p/<lead id>` is not a sign-in either. It sets a `vivah_preview` cookie that ties the preview to the first two browsers that open it: the sign-up screen and the WhatsApp link. The lead stores only the SHA-256 hash of each token. [ADR-0009](./adr/0009-open-a-preview-in-two-browsers.md) records why. The binding decides only who may publish. Anyone with the link sees the preview, for 30 minutes from the first open, then it closes until an admin reactivates it. [ADR-0010](./adr/0010-open-a-preview-to-anyone-for-30-minutes.md) records why. A link-preview fetcher (WhatsApp, Facebook) does not open the link. It gets a small page with the share card, and the timer and the bindings do not change. WhatsApp builds the preview on the sender's phone, so an open from it would start the 30 minutes too early.

Publishing the invite is the second write without a session. The preview page's Server Action calls `publishWedding`, which checks the `vivah_preview` cookie against the stored hash, then reserves the address in one transaction. [ADR-0007](./adr/0007-publish-from-the-bound-preview-browser.md) records why. Until Cashfree is connected, a test payment button starts it.

Every other write route still starts with `requireUser()`.

## Profiles

`users/{uid}` — the app's own record of a person, separate from Firebase Auth, which remains the source of truth for identity.

The document id is the Firebase uid, so a profile is one key lookup from any authenticated request. No query, no index, no second read.

```ts
const profile = await requireUserProfile(user);
```

It is created at sign-in, inside a transaction, because two requests from the same new user can arrive together.

**Why this is allowed to supply its own id.** The rule "never pass your own document id" exists to stop monotonic ids. A monotonic id sends every write to one end of the key range, and Firestore scales by splitting that range. A Firebase uid is 28 characters of random base62, so it spreads exactly like an auto id. The rule's reason permits it.

`repository.createWithId()` is the exception, and `lib/document-ids.ts` keeps it narrow: it rejects sequential ids, date prefixes, bare numbers and anything too short to be random.

### What the user edits

`/profile` lets a signed-in user edit `displayName`, `dateOfBirth` and `gender`. The form sends `PATCH /api/profile`.

- The route takes the uid from the session. The body has no uid, so a user can only edit their own profile.
- `lib/profile-schema.ts` holds the rules. The form and the route use the same schema. The form loads it with `import()`, so zod is not in the first load of `/profile`. `lib/profile-fields.ts` holds the choices and limits, with no dependencies.
- `dateOfBirth` is a `YYYY-MM-DD` string, not a `Date`. A birthday is a calendar day, not an instant, and a `Date` moves it by a day in some time zones.
- `dateOfBirth` and `gender` are optional in the schema permanently. Profiles from before these fields have no value, and only the user can supply one. There is nothing to backfill.
- `null` clears a field.
- Phone and email come from sign-in. The user cannot edit them here.

### Erasure

Deleting one half leaves the account able to sign in and recreate an empty profile. Both are required:

```ts
await deleteUserProfile(uid); // the Firestore document
await getFirebaseAuth().deleteUser(uid); // the Firebase Auth account
```

## The couple dashboard

The couple dashboard lives at `vivah.online/dashboard`. The site header calls it "My site". It uses the same session as the rest of the app.

| Page                     | Who sees it                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `/dashboard`             | Any signed-in person. It opens the couple's newest site and lists any others.       |
| `/dashboard/edit/<slug>` | The couple who owns the site. It shows the same view for a second site on a number. |

Each site view shows the details as read-only text, and "Edit details" opens the form. It also has the guest invite links and a "Sign out" button.

- **Ownership is the phone number.** A couple owns a wedding when the session's verified phone number equals `wedding.ownerPhoneE164`. That is the number they paid with.
- **`/sign-in` offers phone OTP only.** Google sign-in is for `/admin`. A session from an older Google sign-in has no phone number, so the dashboard asks that person to sign in with their phone.
- **The OTP goes in six boxes, one digit each** (`components/auth/OtpInput.tsx`). Firebase always sends 6 digits. Every box has `autocomplete="one-time-code"`, so the phone offers the code from the SMS. A code that is autofilled or pasted spreads across the boxes, and sign-in verifies it at once. The Web OTP API is not used: it needs a last SMS line `@vivah.online #123456`, and the Firebase SMS text cannot be changed.
- **"Edit details" on a live invite opens `/dashboard?site=<slug>`.** Signed out, it goes on to `/sign-in?next=/dashboard&site=<slug>`. Sign-in then shows the last two digits of that site's owner number as a hint, and nothing else about the site. The invite already shows the full number to guests for RSVPs, so the hint reveals nothing new.
- **A stranger gets a 404, not a 403.** The edit page does not tell a stranger that an address exists.
- **The save checks again.** `saveWeddingDetailsAction` calls `requireUser()`, and `updateWeddingDetails` checks ownership on the server. Hiding a page is not the control.
- **Guest links check the same way.** `createGuestLinkAction` and `deleteGuestLinkAction` call `requireUser()`, and `services/guest-link.service.ts` checks ownership. A link is looked up under the caller's own wedding only.
- **A deleted guest link shows the general invite.** The link is soft-deleted and its id stays taken, so a new guest never gets it. A link typed by hand, with no stored record, keeps greeting the guest by name.
- **The slug is not editable here.** Guests already have links to it. Only the admin can move an invite.
- **Logs name the slug and the uid.** Never the phone number, and never a guest's name.

The dashboard needs phone sign-in enabled in Firebase, with an SMS region policy. See [SMS fraud is the real risk](#sms-fraud-is-the-real-risk).

## The admin dashboard

The admin dashboard lives at `vivah.online/admin`. Nothing on the site links to it. The decision is [ADR-0008](./adr/0008-two-step-admin-sign-in.md).

- **Two steps, each a separate Firebase sign-in.** Step 1 is Google, with the account in `ADMIN_EMAIL`. Step 2 is an OTP to `ADMIN_PHONE`. `services/admin-session.service.ts` checks both ID tokens on the server.
- **Its own cookie.** The admin session is the `vivah_admin` cookie, not `__session`. Firestore keeps the SHA-256 of its token in `adminSessions`. A session lasts 12 hours. The Google step is good for 10 minutes.
- **`requireAdmin()` gates every admin write.** It is the first line of every Server Action in `app/(admin)/admin/actions.ts`.
- **Every change goes to the audit log,** in `adminAudit`. The entry names the record, never a phone number or an email address.
- **Off unless configured.** With `ADMIN_EMAIL` or `ADMIN_PHONE` unset, `/admin` is a 404.
- **The Home page tab changes the home page's "How it works" phone screens.** The browser shrinks the image and uploads it straight to the bucket. The server checks it and stores its path in `siteContent/how-it-works-steps`. `GET /api/how-it-works/<step>` serves the image, or the placeholder in `public/how-it-works/`. A change shows on the home page within five minutes.
- **The same tab manages what couples say:** the banner line, the couple reviews (`homeReviews`) and the chat screenshots (`homeChats`). Images take the same path as the step images, under `siteContent/home-reviews/` and `siteContent/home-chats/`. `GET /api/testimonials/<kind>/<id>` serves them. Removing an item is a soft delete, and its image stays. A change shows on the home page within a minute. Each form shows a live preview beside its fields. The preview renders the home page's own card (`CoupleReviewCard` or `ChatNoteCard`) from the unsaved fields. A chosen photo shows from the device before the upload. See `services/testimonials.service.ts`.
- **The same tab uploads the "Watch a demo" video.** The browser checks that the MP4 is "fast start" (its index comes first, so a phone plays it while it downloads). It also draws one frame as a JPEG poster. Both go straight to the bucket, under `siteContent/demo-video/`. The server checks them and stores the names in `siteContent/demo-video`. The home page gets signed URLs in its HTML, which each instance keeps for six hours, so the video starts with no redirect. `GET /api/demo-video/<file>` signs a fresh URL for a page whose URL has expired. A change shows on the home page within a minute. See `services/demo-video.service.ts`.
- **The same tab uploads the three `/help` videos** (edit details, guest invites, and functions). They follow the same rules, each in its own document and folder: `siteContent/help-edit-details-video`, `siteContent/help-guest-invite-video` and `siteContent/help-functions-video`. The fallback route takes `?slot=<slot>`. With no video, the help page shows the steps alone.
- **The same tab sets the sample invite's venues.** The admin changes the wedding's venue name, address and Google Maps link, and the venue and map link of each function. They live in `siteContent/sample-invite`. The sample at `priya-rahul` and the home page's "Try it here" phone (which shows that sample) read them. Before the first save, and when a read fails, the sample shows the Delhi defaults in `lib/sample-invite.ts`. A change shows within a minute. See `services/sample-invite.service.ts`.
- **An admin can make a preview live with no payment.** The preview's page has a **Make live without payment** card, for a couple who paid another way or gets the invite free. The admin types the address and confirms. `makePreviewLive` in `services/admin.service.ts` does the same writes as a paid publish (`writePublish`), in one transaction. It records no payment and sets no `paidAt`, so no purchase conversion counts it. The audit entry `preview-made-live` is the record. Once the invite is live, the same page offers the welcome message to send on WhatsApp.
- **The admin does not edit from `/dashboard`.** An admin phone number alone grants nothing.

It needs Google and Phone enabled in Firebase, and `vivah.online` in the authorised domains. See [Setup](#setup).

### PII

`email`, `phoneNumber` and `dateOfBirth` identify a person. `gender` is sensitive. A `uid` does not identify a person. Application logs go to Cloud Logging, where they are retained and widely readable, so **only the uid is ever logged**. Nothing in `services/auth.service.ts` or `services/user.service.ts` logs an address, a number, a birth date or a gender. A profile update logs the names of the changed fields, never their values. Keep it that way.

---

## Setup

Four steps have no gcloud surface, so `gcp-bootstrap.sh` prints them rather than pretending to do them.

1. **Add Firebase to the GCP project.** It stays the same project.
2. **Register a web app.** Copy `apiKey`, `authDomain` and `appId`.
3. **Enable Google and Phone** under Authentication > Sign-in method.
4. **Set the SMS region policy.** See below. Do not skip it.

Then set four repository variables:

```bash
gh variable set FIREBASE_API_KEY     --body "AIza..."
gh variable set FIREBASE_AUTH_DOMAIN --body "my-project.firebaseapp.com"
gh variable set FIREBASE_PROJECT_ID  --body "my-project"
gh variable set FIREBASE_APP_ID      --body "1:...:web:..."
```

Add every origin the app is served from to **Authorized domains**, including the `*.run.app` URL. Google sign-in is refused from an origin that is not listed.

### The API key is not a secret

The browser must send it to reach Identity Platform, so it ships in every bundle. It names the project; it authorises nothing. Restrict it by HTTP referrer in the Google Cloud console under APIs & Services > Credentials.

Putting it in a GitHub **secret** achieves nothing and makes it harder to debug. It is a **variable**.

### These are build-time values

`NEXT_PUBLIC_*` is inlined into the JavaScript at build time. Setting one on the Cloud Run service changes nothing — the value is already inside the code users downloaded. **Rebuild the image.** This is trap 8, and it catches everyone once.

### Leaving it unconfigured is safe

An app built with no Firebase config serves public reads and answers 401 to every write. `authEnabled` in `lib/env.ts` is derived from the config being complete, not from a flag, so a half-finished setup can never become an open endpoint.

---

## SMS fraud is the real risk

Phone auth sends a message that **you pay for**. An open send endpoint is the target of SMS pumping fraud: an attacker sends codes to premium-rate numbers they collect revenue from, and the bill is yours. It is automated, and it finds new endpoints quickly.

Three controls, in order of how much they matter:

1. **SMS region policy.** Authentication > Settings > SMS region policy. Allow only the countries you serve. The default allows every country on earth, and the fraud lives in the ones you do not sell to. This is the single most effective control.
2. **reCAPTCHA.** Already wired: `useFirebaseAuth` creates an invisible verifier, which is mandatory for phone auth. It solves itself for nearly every real user.
3. **A budget alert.** It will not stop an attack, but it is how you find out in hours rather than at the end of the month. `gcp-bootstrap.sh` prints the command.

Firebase also applies its own per-number and per-IP limits. Do not rely on them alone.

---

## The one broad role

The runtime service account holds `roles/firebaseauth.admin`. It is the broadest role that identity has, and it is deliberate rather than overlooked.

Minting a session cookie calls the Identity Toolkit API, which needs a role on the project. There is no narrower predefined role that can do it. The role can also create, disable and delete users.

**Verifying a session needs no IAM at all** — it checks a signature against Google's published public keys. So a missing or broken grant has a distinctive symptom: existing sessions keep working, and only new sign-ins fail, with `PERMISSION_DENIED` from `identitytoolkit`. That looks like a client bug and is not one.

Narrow it with a custom role if your threat model needs it. Read that symptom first, so you recognise it when it appears.

---

## Local development

Sign-in talks to real Firebase even on a laptop. The Firestore emulator does not cover Auth in this template.

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-project
NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...
```

Add `localhost` to Authorized domains in the console.

The session cookie is `Secure` everywhere except plain-HTTP localhost, where a browser refuses to store a Secure cookie. That carve-out is derived from `NEXT_PUBLIC_APP_URL`, not from the request, so a forged `X-Forwarded-Proto` header cannot downgrade it in production.

---

## Settings

| Variable                    | Default | What it does                                        |
| --------------------------- | ------- | --------------------------------------------------- |
| `AUTH_SESSION_MAX_AGE_DAYS` | `14`    | Session lifetime. Firebase caps it at 14.           |
| `AUTH_CHECK_REVOKED`        | `false` | Check every request against revoked refresh tokens. |

`AUTH_CHECK_REVOKED` costs one call to Identity Platform on **every** authenticated request — a per-request dependency on an external service in the hot path. On, "sign out everywhere" takes effect immediately. Turn it on for an app handling money or health data; leave it off for most.

---

## What to do when something fails

| Symptom                                                     | Cause                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Sign-in works, then the user is signed out on the next page | The cookie is not named `__session`, and Hosting stripped it           |
| New sign-ins fail, existing sessions keep working           | The runtime account is missing `roles/firebaseauth.admin`              |
| `auth/unauthorized-domain`                                  | The origin is not in Authentication > Settings > Authorized domains    |
| `auth/operation-not-allowed`                                | That provider is not enabled in the console                            |
| The sign-in panel says "not configured"                     | The web config is missing from the **build**. Rebuild, do not restart  |
| `auth/invalid-app-credential` on phone sign-in              | reCAPTCHA could not load, or the domain is not authorised              |
| An unexpected SMS bill                                      | The SMS region policy is still the default. Restrict it now            |
| 401 from a write route with a user clearly signed in        | The cookie did not reach the server. Check `Secure` against the scheme |

The full table is in [troubleshooting.md](./troubleshooting.md).
