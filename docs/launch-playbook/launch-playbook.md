# Launch playbook: template repo to live product

**For:** an AI agent (Claude Code or similar) that starts a new product with the owner.
**Built from:** the Vivah project (vivah.online), 12 Oct to 1 Nov 2026. It went from a cloned template to a live, paid product with ads in about 10 days.
**Human version:** `launch-playbook.html` in this folder.

Read this file before your first action in a new project. Follow the phases in order. Each phase lists the steps, the decision and its reason, and the traps we hit.

---

## 0. Rules for the agent

1. **Ask for every Day-0 item (section 1) in your first reply.** Ask once, as one list. Long-lead items (KYC, verification, DNS) start on day 1, in parallel with the code.
2. **Never ask for a secret in chat.** The owner puts secrets in GCP Secret Manager or the Cloudflare dashboard. If the owner pastes a secret, tell them to rotate it at once.
3. **Never write personal IDs** (Aadhaar, PAN, bank numbers, Udyam number, home address) into the repo, project memory or a public page.
4. **The repo is public by default.** Keep owner emails, phone numbers, account IDs and invoice details in GitHub **variables**, not in code.
5. **Pay-per-use only.** No service with a flat monthly fee until revenue pays for it. Note the exception when the owner chooses one (Vivah: Cloudflare Workers Paid $5/month, Cloud Run min instance ~₹850/month).
6. **Every change goes through a pull request.** A push to `main` deploys to production. Run `pnpm validate` before each push.
7. **Write an ADR** for each decision that is expensive to reverse (payments, tracking, anonymous writes, admin auth).
8. **Save each lasting fact to project memory in the same turn** (decisions, account names, what is live, what is pending).
9. **Show only built features** on the site, in ads and in AI-readable text. Never invent reviews or perks.

---

## 1. Day-0 intake: ask the owner for these first

Copy this list into your first message. Mark each item "have it" or "start now".

### 1a. Decisions (answers, not files)

| Item                                             | Why it is needed                              | Vivah example                                            |
| ------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------- |
| Product name and one-line pitch                  | Domain, brand, every page title               | "Wedding invite website, every guest their own link"     |
| Target market, language, city for sample content | Copy, ads, SEO, examples                      | India, Hindu weddings, English + Hinglish, Delhi samples |
| Price, plans, currency                           | Pricing page, payment code, ads               | ₹799 Basic; coupons as % off                             |
| Refund policy in one line                        | Legal pages and gateway review                | No change-of-mind refund, free date change once          |
| Domain shortlist (3)                             | Buy on day 1                                  | vivah.online                                             |
| Cloud region                                     | Firestore and bucket location are permanent   | asia-south1 (Mumbai)                                     |
| Monthly budget cap for infra and ads             | Stop-loss rules                               | Ads ₹10,000/month cap, ₹1,500 stop-loss with no sale     |
| Who is the legal account holder                  | KYC name must match bank, PAN, domain invoice | Owner's spouse (individual, unregistered)                |

### 1b. Brand assets

- Logo, or a reference image and the idea behind it. If none, the agent makes a kit (SVG master + PNG, favicon `.ico`, app icons, OG image 1200x630, social avatars).
- Brand colours and fonts, or a design-system export (for example a claude.ai design file exported as HTML: cloud sessions cannot read it directly).
- Tone of voice and words to avoid. Example: "say we are a small team, never a person's name".
- Any photos, demo video or screenshots the owner wants to use.

### 1c. Accounts the owner creates or gives access to

| Account                           | What the agent needs from it                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| GitHub                            | Repo made from the template; the Claude GitHub app installed on it                        |
| Google Cloud                      | Project with billing on, a budget alert, `gcloud` access for the human who runs bootstrap |
| Firebase                          | Added to the **same** GCP project; web app config (public values)                         |
| Domain registrar (e.g. Hostinger) | Domain bought **in the KYC account holder's name**                                        |
| Cloudflare (free)                 | Zone for the domain; later Worker, Email Routing, WAF                                     |
| Gmail                             | Destination for hello@ / support@                                                         |
| Business phone number             | A SIM used only for the business, WhatsApp Business app on it                             |
| Meta                              | Facebook Page, Business portfolio, Instagram professional account, ad account             |
| Google Ads + Search Console       | Ads account (prepaid), domain property for SEO                                            |
| Payment gateway(s)                | Razorpay and/or Cashfree, KYC started on day 1                                            |
| Telegram bot                      | Bot from @BotFather, the owner's chat id (for sale and lead alerts)                       |

### 1d. KYC documents (India; the owner keeps them, never send to the agent)

- PAN and a savings bank account in the **same name**.
- Aadhaar linked to a working mobile (for e-KYC).
- Address proof for the address where the business runs. If Aadhaar shows another state, register **Udyam (MSME)**: free, online, same day, and it names the current address.
- Domain purchase invoice in the account holder's name (gateways ask for it).
- GST is not needed for services under ₹20 lakh a year. Never charge GST or show "incl. GST" when unregistered.

### 1e. Content the owner must write or approve

- Business display name, support email, grievance contact, business address for the Contact page.
- Real testimonials with permission (or none: never invent).
- Social bios, first 3 posts, the WhatsApp greeting and quick replies.

---

## 2. Phase map

| #   | Phase                                  | Typical time              | Blocks     |
| --- | -------------------------------------- | ------------------------- | ---------- |
| 1   | Decide and intake                      | Day 0                     | everything |
| 2   | Repo, cloud and first deploy           | Day 1                     | 3, 7       |
| 3   | Domain, DNS and Cloudflare             | Day 1-2                   | 5, 7, 9    |
| 4   | Brand and design system                | Day 1-3                   | 6          |
| 5   | Email, phone and social accounts       | Day 2-3                   | 7, 10      |
| 6   | Product build, legal pages, admin      | Day 2-8                   | 7          |
| 7   | Payments and KYC                       | Day 1-9 (waits on review) | 10         |
| 8   | Alerts and operations                  | Day 4-8                   | —          |
| 9   | Measurement, SEO and AI visibility     | Day 5-9                   | 10         |
| 10  | Go to market: first sale, organic, ads | Day 9+                    | —          |
| 11  | Run, measure and improve               | ongoing                   | —          |

Start phase 7 (KYC) and the Meta verification on day 1. They wait on other people.

---

## 3. Phase 2: repo, cloud and first deploy

**Stack (from the template):** Next.js App Router + TypeScript strict, Docker, Cloud Run, Firestore (named database), Cloud Storage, Firebase Auth (phone OTP + Google), GitHub Actions with Workload Identity Federation (no keys).

Steps:

1. Make the repo from the template (`gh repo create <app> --template <owner>/<template> --private --clone`). Use the template, not a fork.
2. `./scripts/rename-project.sh <app> --owner <gh-owner> --project <gcp-project>`.
3. Human runs `./scripts/gcp-bootstrap.sh --project … --region … --repo … --service …` **before the first merge** (the deploy publishes Firestore indexes first and fails without a database). Service name ≤22 characters.
4. Set GitHub secrets `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` and variables `GCP_PROJECT_ID`, `GCP_REGION`, `APP_SLUG`, `CLOUD_RUN_SERVICE`, `RUNTIME_SERVICE_ACCOUNT` (never skip the last one: without it the app runs as the project Editor).
5. Firebase console: add Firebase to the existing project, register a web app, enable Phone (and Google), **restrict the SMS region policy to your countries**, add a test phone number, add authorised domains (localhost, run.app URL, your domain).
6. Set `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID` as **variables** (public, inlined at build). Redeploy after any change.
7. Merge to `main`, then `curl <run.app>/api/health` returns 200.
8. Set a billing budget alert.

Decisions and why:

- **Cloud Run, not Vercel or a VM:** pay-per-use, scales to zero, region near users.
- **No service-account keys:** OIDC through Workload Identity Federation.
- **Server-only data layer:** the browser never gets the Firestore SDK.

Traps:

- `NEXT_PUBLIC_*` values are fixed at build time. Changing them on the service does nothing.
- `asia-south1` has no Cloud Run domain mapping. Use Cloudflare (phase 3) or Firebase Hosting.
- Each new Firestore index exemption takes ~6 minutes. Many at once can pass the deploy job timeout. Send them async.
- A Cloud Run revision name must be unique and ≤63 characters. A re-run needs its own suffix.
- An open admin tab from before a deploy fails Server Actions with 409. A reload fixes it. Make the error say so.

---

## 4. Phase 3: domain, DNS and Cloudflare

Steps:

1. Buy the domain at the registrar, in the KYC account holder's name, auto-renew on.
2. Export existing DNS records. Turn DNSSEC off at the registrar before you move nameservers.
3. Add the zone to Cloudflare (Free). Change nameservers at the registrar. Wait for "Active".
4. SSL/TLS **Full (strict)**, Always Use HTTPS on.
5. Decide the routing:
   - **One host only:** Firebase Hosting custom domain (free) or a simple Worker.
   - **Wildcard subdomains** (one site per customer, like `<couple>.vivah.online`): proxied `AAAA * 100::` and `AAAA @ 100::`, plus a Worker on routes `*.<domain>/*` and `<domain>/*`, failure mode **fail closed**. The Worker forwards to the `run.app` URL with `X-Forwarded-Host`, redirects `www` to the apex, and rewrites any `Location` that points at `run.app`. The app reads the host and rewrites to `/site/<slug>`.
6. Set GitHub variable `ROOT_DOMAIN` and `APP_URL`, redeploy.
7. WAF custom rule "Block scanners": paths containing `.php`, `/wp-`, `/.env`, `/.git`, or `//`.

Decisions and why:

- **Worker, not a Google load balancer:** neither Cloud Run nor Firebase Hosting supports wildcard domains; a load balancer costs ~$18/month flat.
- **Slugs one level deep:** free Universal SSL covers `*.domain` only.

Traps we hit:

- **SSRF in the Worker:** `new URL(path, ORIGIN)` with a path that starts with `//` fetches another host. Build the target as `new URL(ORIGIN + path + search)`. (Fixed in the Vivah Worker on 19 Oct 2026 and in `cloud/domain-routing.md` in PR #148.)
- **Worker free plan (100k requests/day) ran out** with zero users: a bot scan from cloud IPs made ~150k requests in a day. With the `100::` origin, running out takes the whole site down. Fix: the scanner rule above, then Workers Paid ($5/month) if needed. Watch the Workers metrics in week 1.
- **Do not challenge whole cloud networks** (for example a "Challenge Google Cloud" ASN rule). It blocks Claude Code, Claude chat, AI crawlers, and can block payment webhooks. Bot Fight Mode can block webhooks too. Allow AI crawlers in AI Crawl Control if you want AI search to read the site.
- Redirects behind the Worker must be **relative**. `request.url` inside Cloud Run is `0.0.0.0:8080`.
- Agent sandboxes run on GCP. If the site challenges GCP, the agent cannot test it with curl.
- A `X-Router-Secret` check (reject direct `run.app` hits) was planned and not built. Decide it on day 1.

---

## 5. Phase 4: brand and design system

Steps:

1. Get or make the logo. Keep a generator script (SVG source) and export from it. Never hand-edit exports.
2. Export: mark in colour/plum/white, wordmark, horizontal and stacked lockups, local-language lockup if useful, `favicon.ico` (16/32/48), `icon.png` 192, apple-touch 180, maskable 512, OG image 1200x630, Instagram/WhatsApp avatars.
3. Put the design tokens in `styles/globals.css` as the default theme. Every screen uses the tokens and the UI primitives.
4. Keep a separate look for customer-facing output if it needs one (Vivah: the invite pages use maroon/gold; the product site uses the "Phera" system).

Traps:

- Google shows a globe in search results until the site has `favicon.ico` and a PNG icon in a multiple of 48px. A refresh takes days to weeks after "Request indexing".
- Thin logo details blur below ~40px: make a simpler "small" cut for favicons.
- A font without a needed glyph (Vivah: ₹) can pull a large fallback font file. Check font `unicode-range`.
- Pages that set their own `openGraph` must list the share image again.

---

## 6. Phase 5: email, phone and social accounts

Order: email → Facebook Page + Business portfolio → Instagram → WhatsApp Business → domain verification in Meta.

Steps:

1. **Cloudflare Email Routing:** `hello@` and `support@` forward to the owner's Gmail. Let Cloudflare add MX, SPF and DKIM.
2. **Gmail "Send mail as"** with display name = brand. One SPF record only: `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`.
3. **DMARC** `v=DMARC1; p=none; rua=mailto:hello@<domain>`. Keep `p=none`.
4. Facebook Page (brand name, logo, site, email, WhatsApp) → Business portfolio → add a second admin.
5. Instagram professional account, linked to the Page and portfolio. Bio link through a short redirect (`/ig` → `/?utm_source=instagram&utm_medium=organic&utm_campaign=bio`).
6. WhatsApp Business **app** on the business SIM: profile, greeting, quick replies, labels. Link it to the Page and Instagram from the phone app.
7. Meta domain verification: TXT record in Cloudflare.

Decisions and why:

- **Manual WhatsApp sending at launch** (the admin opens `wa.me` links from the Business app). The Cloud API needs a partner for "coexistence" with the app, or a second number. The code for API sending exists but stays off until `WHATSAPP_*` variables are set.
- **Telegram for internal alerts**: free, instant, no template approval.

Traps:

- Gmail "Send mail as" mail **fails DMARC** (no DKIM for your domain). It can land in spam. Fix later with an SMTP that signs for your domain (Brevo free SMTP keeps Cloudflare MX). Never tighten DMARC before that.
- **Never "Add" the WhatsApp Business app number in Meta's WhatsApp accounts screen:** it moves the number to the API and removes it from the app.
- A Meta test number (+1 555…) appears after making a developer app. Leave it.

---

## 7. Phase 6: product build, legal pages and admin

Build in this order, one PR each, smallest useful version first:

1. **Lead capture** with no sign-in (`POST /api/leads`, rate-limited per IP, its own ADR).
2. **Instant preview** of the customer's own product (Vivah: their invite with their names). The preview converts far better than a sample.
3. **Pay → publish** in one server transaction (test mode first).
4. **Customer dashboard** (phone OTP) to edit after payment.
5. **Legal pages**, linked in the footer: About, Contact (email + phone + address), Terms & Conditions, Privacy Policy, Refund & Cancellation, Shipping/Delivery (for digital goods: "live within X minutes, link on WhatsApp"). Pricing visible on the site. Gateways reject sites without these.
6. **Admin at `/admin`**: Google sign-in for one allowed email (`ADMIN_EMAIL`) **then** OTP to `ADMIN_PHONE`, its own cookie, an audit log. Never link `/admin` from the site, sitemap or `robots.txt`.
7. Admin tools we needed in practice: lead list with tags (New/Hot/Cold/Test), "make live without payment", per-customer toggles, content editing for the home page (reviews, banner, demo video, offer ribbon), coupons, clean-up of test data, a funnel view.
8. A **Help page** with short how-to videos; move the FAQ there.

Decisions and why:

- **Reads public, writes need a session.** Each anonymous write needs an ADR (leads, visit beacons, webhooks).
- **Soft delete** by default; permanent delete only for test-data clean-up and erasure requests.
- **No individual names on the site**; speak as "a small team".

Traps:

- Browser uploads to the bucket need **bucket CORS** (`cloud/storage-cors.json`); a human applies it (the deployer has no Storage role).
- Admin cookie `SameSite=Strict` signs the admin out when they tap a link from Telegram. Use `Lax` and a long sliding session.
- iOS Safari: `input type=date` shows no format and overflows; draw your own. Phone fields must strip autofilled `0` / `+91`.
- Phone OTP can fail on the first try on iPhone Chrome; add a clear retry.

---

## 8. Phase 7: payments and KYC (India)

Start KYC on **day 1**. It is the longest wait.

Steps:

1. Apply to **two gateways in parallel** (Razorpay and Cashfree). Same documents. Sign up directly, not through a partner link.
2. Business type: Individual/Unregistered unless you have GST. Category: digital services. The legal pages must be live before review.
3. Store keys in Secret Manager. Set the GitHub variables (section 13).
4. Build: server creates the order/link with the **server-computed price** → customer pays → the server **re-reads the payment from the gateway API** and checks the signature → publish. A webhook does the same, so a closed tab still publishes. Never trust the browser redirect or a client-sent amount.
5. Store a `payments` record (provider, order id, amount, coupon, paid time). It feeds conversions and invoices.
6. Go live with **live keys**; test with your own UPI for a small real amount, then refund from the dashboard.
7. Webhook URL `https://<domain>/api/payments/<provider>`; Razorpay event `order.paid`.

Decision and why (Vivah):

- Cashfree was first (0% fee offer). Its **Payment Links API needs a separate approval** after full KYC, which did not come in time. Razorpay passed KYC in a day. We moved to **Razorpay Standard Checkout** (pop-up on our page, the customer stays on the site). `PAYMENT_PROVIDER` picks the gateway, so both stay in code.

Traps:

- The KYC name must match PAN, bank and the **domain invoice**. Buy the domain in the account holder's name.
- Aadhaar address in another state → address proof problem. Udyam registration fixes it.
- A long per-message timeout shared by several alert messages lost the important ones after a payment. Give each outbound message its own timeout and one retry.
- Struck-through "was" prices and big % OFF labels can read as misleading pricing. Use them only if the owner accepts the risk.
- If the address/slug was taken while paying: keep the payment, let the customer pick a new address free. A second payment for the same order → alert to refund.

---

## 9. Phase 8: alerts and operations

- **Telegram bot** alerts: new lead (alert + admin link + ready-to-paste WhatsApp message + phone), payment (alert + welcome message + phone). Variables `TELEGRAM_TOKEN_SECRET`, `TELEGRAM_CHAT_ID`.
- **Follow-up scripts** in admin: a copyable WhatsApp message per lead, a 7-day nudge series, a phone sales script. Let the owner tag leads by hand; do not add automatic "hot" flags unless asked.
- **Cost controls:** `MIN_INSTANCES=0` at launch; 1 when cold starts hurt (~₹850/month). `MAX_INSTANCES` caps the Cloud Run bill.
- **Firestore TTL policies** must be turned on once by a human (beacon data, old leads).
- **Dependency upgrades** in one verified PR; keep TypeScript where the linters support it.

---

## 10. Phase 9: measurement, SEO and AI visibility

Measurement (privacy first):

1. **Own first-party beacon** for page visits, CTA taps and funnel steps (no cookie, no third party, 12-month expiry). Report in `/admin`.
2. **Google Ads tag** with two conversions: "Sign-up/Preview made" and "Purchase" (value = amount actually paid). Store `gclid` on the lead. No remarketing, no analytics, enhanced conversions off.
3. **Meta Pixel, minimal:** only `Lead` and `Purchase` (with an event id = payment id), no PageView, `autoConfig` off, no customer data.
4. Update the privacy page in the same PR that adds any tag. Write an ADR for each.
5. **UTM convention:** `utm_source` (instagram, facebook, google), `utm_medium` (organic, paid), `utm_campaign` (ad or post code, e.g. A01). Coupon codes per channel also show the source.
6. Give ads and bio links a **direct landing page with the form** (Vivah: `/details`), not the home page.

SEO and GEO:

1. Sitemap, robots (allow all on the product site; block customer subdomains), canonical URLs, `noindex` on previews.
2. Schema: Organization, WebApplication with a feature list, FAQPage, Breadcrumb.
3. `public/llms.txt` with "what is included". AI assistants describe only what crawlable text says, so add each new feature to the feature list and `llms.txt` in the same PR.
4. Keyword landing pages for 3-6 high-intent searches.
5. Google Search Console + Bing: verify, submit sitemap, request indexing.
6. Mobile PageSpeed: inline CSS, limit font subsets, edge cache for static pages if TTFB is high.

---

## 11. Phase 10: go to market

Rule: **no ad money until one real payment has gone through end to end.**

1. **First sale plan:** message 30-50 people one by one ("who do you know …"), a founding-customer offer in exchange for a review, make the preview **for** them, referral cashback, local vendors as partners.
2. **Instagram organic:** be the account people send to a friend. Ratio 7 useful tips : 2 tips with the product : 1 direct pitch. 3 Reels + 2 carousels a week, Stories most days. Only posts that pass a boost test (hold rate, saves, sends) get ad money.
3. **Meta ads:** Leads objective optimised for the `Lead` event, small daily budget, 3-5 creatives, Hinglish copy where the market uses it. Check leads by hand: price-comparison creatives attracted **other businesses**, not customers. Pause those.
4. **Google Ads:** prepaid account, Search campaign with exact/phrase keywords, Purchase goal only, auto-apply off, shared negative list. A low max CPC (₹6, then ₹15) gave **zero impressions** for days. Plan a realistic CPC or skip Search for a niche with little volume. Avoid a "Contact us" sitelink (it was disapproved). Never claim a policy you changed (e.g. "7-day refund").
5. **Stop-loss:** write it before spending (Vivah: pause if ₹1,500 spent across Meta + Google with no payment). Expect the first sale after a few hundred rupees of spend, not on day 1.
6. **Follow up every real lead within an hour** by WhatsApp or a call.

---

## 12. Phase 11: run and improve

- Weekly: visits → leads → previews → paid, by source. Fix the biggest drop first.
- Conversion work that helped Vivah: a clear pay button with the price, reviews on the pay sheet, a "share with family" button, a WhatsApp "questions?" link, trust lines (free date change), coupons with rounded prices.
- Record each decision in an ADR and each fact in project memory.

---

## 13. Configuration names (no values)

**GitHub secrets:** `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`.

**GitHub variables, core:** `GCP_PROJECT_ID`, `GCP_REGION`, `APP_SLUG`, `APP_NAME`, `APP_URL`, `ROOT_DOMAIN`, `CLOUD_RUN_SERVICE`, `RUNTIME_SERVICE_ACCOUNT`, `ARTIFACT_REPOSITORY`, `FIRESTORE_DATABASE_ID`, `GCS_BUCKET`, `MIN_INSTANCES`, `MAX_INSTANCES`, `LOG_LEVEL`, `HEALTH_DEEP_CHECKS_ENABLED`.

**Auth and admin:** `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_HOSTING_ENABLED`, `AUTH_CHECK_REVOKED`, `AUTH_SESSION_MAX_AGE_DAYS`, `ADMIN_EMAIL`, `ADMIN_PHONE`.

**Payments:** `PAYMENT_PROVIDER` (auto | cashfree | razorpay), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET_SECRET`, `RAZORPAY_WEBHOOK_SECRET_SECRET`, `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY_SECRET`, `CASHFREE_ENV`, `INVOICE_ISSUER`.

**Messaging:** `TELEGRAM_TOKEN_SECRET`, `TELEGRAM_CHAT_ID`, `WHATSAPP_TOKEN_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_PREVIEW_TEMPLATE`, `WHATSAPP_PREVIEW_TEMPLATE_LANGUAGE`.

**Ads:** `GOOGLE_ADS_ID`, `GOOGLE_ADS_SIGNUP_LABEL`, `GOOGLE_ADS_PURCHASE_LABEL`, `META_PIXEL_ID`.

A variable that ends in `_SECRET` holds the **name** of a Secret Manager secret, not the value. Secret Manager names used: `razorpay-key-secret`, `razorpay-webhook-secret`, `cashfree-secret-key`, `telegram-bot-token`, `whatsapp-access-token`. The runtime service account needs Secret Accessor on each.

**Cloudflare Worker secret:** `ROUTER_SECRET`.

**DNS records (Cloudflare):** `AAAA @ 100::` and `AAAA * 100::` (proxied, when a Worker routes); MX ×3 and DKIM from Email Routing; one SPF TXT; `_dmarc` TXT; Meta domain-verification TXT; Search Console TXT. Mail records are always DNS-only.

---

## 14. Launch-day checklist

- [ ] `/api/health` 200 on the domain; `www` redirects
- [ ] Legal pages, pricing and contact visible; footer links work; 404 page exists
- [ ] Sign-up → preview → pay (real, small) → publish → refund, end to end on a phone
- [ ] Telegram alerts arrive for a lead and a payment
- [ ] Admin sign-in works on the owner's phone
- [ ] Favicon, title, description and OG image on every page; share link shows the image on WhatsApp
- [ ] Search Console verified, sitemap submitted
- [ ] Google and Meta test conversions show in Tag Assistant / Events Manager
- [ ] Budget alert set; Worker request graph checked; scanner WAF rule on
- [ ] Email to hello@ arrives and the reply comes from the brand address
- [ ] Project memory updated with what is live and what is pending

---

## 15. Vivah timeline (for scale)

| Date (2026)     | Milestone                                                                           |
| --------------- | ----------------------------------------------------------------------------------- |
| Sep 21 – Oct 13 | Idea, PRD, competitor research, pricing, domain chosen                              |
| Oct 14          | Domain on Cloudflare, Worker routing live, lead form + preview + legal pages merged |
| Oct 15          | Brand kit, email routing, social accounts, admin, sign-up card                      |
| Oct 16-18       | Preview as the real invite, WhatsApp/Telegram alerts, Cashfree code                 |
| Oct 19          | Bot scan hits Worker limit; WAF rules; Udyam for KYC                                |
| Oct 21          | Razorpay KYC passes, payments live                                                  |
| Oct 22          | Google Ads tag + first campaign; help page                                          |
| Oct 24-25       | Coupons + ₹799 price; Meta Pixel; first Meta campaign                               |
| Oct 26 – Nov 1  | Conversion work on the pay step, lead tracker, ad landing page                      |
