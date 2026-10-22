/**
 * Typed, validated access to environment variables.
 *
 * Why this file exists: `process.env.FOO` is `string | undefined` everywhere,
 * so a missing variable surfaces as a confusing runtime error deep in a request
 * handler — often only in production. Validating once, at module load, turns
 * that into a loud failure at container start, which Cloud Run reports as a
 * failed revision instead of silently serving broken traffic.
 *
 * Rules:
 *   - Every variable the app reads MUST be declared here and in `.env.example`.
 *   - Never read `process.env` directly outside this file.
 *   - Server-only values must never be re-exported into a Client Component.
 *     Anything the browser may see has to be prefixed `NEXT_PUBLIC_`.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time, so those reads are
 * written out literally below rather than looked up dynamically.
 *
 * Data-layer configuration (`APP_SLUG`, `GCP_PROJECT_ID`, `FIRESTORE_DATABASE_ID`,
 * `GCS_BUCKET`) is derived, not repeated. Set `APP_SLUG` and `GCP_PROJECT_ID`
 * and the database id and bucket name follow the template's naming convention.
 * Override either one explicitly when an existing resource has another name.
 */

type NodeEnv = 'development' | 'production' | 'test';

const VALID_NODE_ENVS: readonly NodeEnv[] = ['development', 'production', 'test'];
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof VALID_LOG_LEVELS)[number];

/**
 * Identifier shapes, checked here so a typo fails the revision at start rather
 * than as a `NOT_FOUND` from Google an hour later. Each mirrors the provider's
 * own published constraint.
 */

/** Same rule as `scripts/rename-project.sh`: valid for npm and Cloud Run alike. */
const SLUG_PATTERN = /^[a-z][a-z0-9-]{0,48}$/;

/** GCP project ids: 6-30 chars, lowercase letters, digits and hyphens. */
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

/** Firestore database ids: 4-63 chars, or the literal `(default)`. */
const DATABASE_ID_PATTERN = /^(\(default\)|[a-z][a-z0-9-]{2,61}[a-z0-9])$/;

/**
 * Cloud Storage bucket names: 3-63 chars for a non-dotted name. Dotted
 * (domain-named) buckets are legal but need domain verification, so the
 * template does not generate them.
 */
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9_-]{1,61}[a-z0-9]$/;

/**
 * Firebase web API keys. Long-lived, and NOT a secret: the browser needs it to
 * reach Identity Platform, so it ships in every bundle. It identifies the
 * project; it authorises nothing on its own. Restrict it by HTTP referrer in
 * the Google Cloud console instead of trying to hide it. See docs/auth.md.
 */
const FIREBASE_API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{35}$/;

/** A bare hostname, e.g. `my-project.firebaseapp.com`. No scheme, no path. */
const FIREBASE_AUTH_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9.-]{1,251}[a-z0-9]$/;

/**
 * A bare root domain for couple invites, e.g. `vivah.online`. At least one
 * dot, lowercase, no scheme, no port, no path.
 */
const ROOT_DOMAIN_PATTERN =
  /^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

/** Firebase web app ids look like `1:1234567890:web:0a1b2c3d4e5f`. */
const FIREBASE_APP_ID_PATTERN = /^\d+:\d+:web:[0-9a-z]+$/;

/** A Google Ads conversion id, `AW-123456789`. */
const GOOGLE_ADS_ID_PATTERN = /^AW-\d{6,15}$/;

/** A Google Ads conversion label: the part after the slash in `send_to`. */
const GOOGLE_ADS_LABEL_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

class EnvValidationError extends Error {
  constructor(issues: readonly string[]) {
    super(
      `Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}\n\n` +
        'See .env.example for the full list of supported variables.',
    );
    this.name = 'EnvValidationError';
  }
}

const issues: string[] = [];

function optional(value: string | undefined, fallback: string): string {
  return value === undefined || value.trim() === '' ? fallback : value;
}

function oneOf<T extends string>(
  name: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined || value.trim() === '') return fallback;
  if (!allowed.includes(value as T)) {
    issues.push(`${name} must be one of [${allowed.join(', ')}] but was "${value}"`);
    return fallback;
  }
  return value as T;
}

/** A bounded integer. Out-of-range values are an error, not silently clamped. */
function integer(
  name: string,
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    issues.push(`${name} must be an integer between ${min} and ${max} but was "${value}"`);
    return fallback;
  }
  return parsed;
}

function port(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    issues.push(`${name} must be an integer between 1 and 65535 but was "${value}"`);
    return fallback;
  }
  return parsed;
}

/**
 * Checks a value against an identifier shape. Returns `''` for an unset value
 * (and for an invalid one, after recording the issue) so callers can treat
 * "absent" and "rejected" the same way — the thrown error lists every problem
 * at once rather than one per restart.
 */
function pattern(
  name: string,
  value: string | undefined,
  regex: RegExp,
  requirement: string,
  fallback = '',
): string {
  const resolved = optional(value, fallback);
  if (resolved === '') return '';
  if (!regex.test(resolved)) {
    issues.push(`${name} ${requirement} but was "${resolved}"`);
    return '';
  }
  return resolved;
}

function boolean(name: string, value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  const normalised = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalised)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalised)) return false;
  issues.push(`${name} must be a boolean (true/false) but was "${value}"`);
  return fallback;
}

const rootDomain = pattern(
  'ROOT_DOMAIN',
  process.env.ROOT_DOMAIN,
  ROOT_DOMAIN_PATTERN,
  'must be a bare lowercase domain with no scheme, port or path, e.g. vivah.online',
);

/**
 * The admin's two sign-in factors: a Google account, then an OTP to a phone.
 * See ADR-0008. Both must be set, or `/admin` answers 404 for everyone.
 *
 * Not secrets: neither grants anything without the Google password and the
 * phone. The email is still set as a GitHub variable, not in the repository,
 * because the repository is public.
 */
const adminEmail = pattern(
  'ADMIN_EMAIL',
  process.env.ADMIN_EMAIL?.trim().toLowerCase(),
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  'must be one email address, like admin@example.com',
);

const adminPhone = pattern(
  'ADMIN_PHONE',
  process.env.ADMIN_PHONE?.trim(),
  /^\+\d{8,15}$/,
  'must be one E.164 phone number, like +919876543210',
);

/**
 * WhatsApp Cloud API, for sending a couple their preview link after sign-up.
 * See `services/whatsapp.service.ts` and `cloud/environment-variables.md`.
 *
 * Sending is on only when the token, the phone number id and the template
 * name are all set. Leave any one empty and sign-up works as before: the
 * preview opens on screen and nothing is sent. It fails closed, not down.
 *
 * The access token IS a secret. It comes from Secret Manager at runtime,
 * never from the repository, a build arg or a `NEXT_PUBLIC_*` name.
 */
const whatsappAccessToken = optional(process.env.WHATSAPP_ACCESS_TOKEN, '').trim();

const whatsappPhoneNumberId = pattern(
  'WHATSAPP_PHONE_NUMBER_ID',
  process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  /^\d{6,20}$/,
  'must be the numeric phone number id from WhatsApp Manager, not the phone number',
);

const whatsappTemplateName = pattern(
  'WHATSAPP_PREVIEW_TEMPLATE',
  process.env.WHATSAPP_PREVIEW_TEMPLATE?.trim(),
  /^[a-z0-9_]{1,512}$/,
  'must be an approved template name: lowercase letters, digits and underscores',
);

const whatsappTemplateLanguage = pattern(
  'WHATSAPP_PREVIEW_TEMPLATE_LANGUAGE',
  process.env.WHATSAPP_PREVIEW_TEMPLATE_LANGUAGE?.trim(),
  /^[a-z]{2,3}(_[A-Z]{2})?$/,
  'must be a WhatsApp template language code, like en or en_US',
  'en',
);

const whatsappGraphVersion = pattern(
  'WHATSAPP_GRAPH_API_VERSION',
  process.env.WHATSAPP_GRAPH_API_VERSION?.trim(),
  /^v\d{1,3}\.\d$/,
  'must be a Graph API version, like v23.0',
  'v23.0',
);

/**
 * Telegram bot that tells the team about each new preview. See
 * `services/telegram.service.ts` and `cloud/environment-variables.md`.
 *
 * It is on only when the bot token and the chat id are both set. Leave either
 * empty and nothing is sent. The bot token IS a secret: it comes from Secret
 * Manager at runtime, like the WhatsApp token.
 */
const telegramBotToken = optional(process.env.TELEGRAM_BOT_TOKEN, '').trim();

const telegramChatId = pattern(
  'TELEGRAM_CHAT_ID',
  process.env.TELEGRAM_CHAT_ID?.trim(),
  /^-?\d{1,20}$/,
  'must be a numeric Telegram chat id, like 123456789 or -1001234567890',
);

/**
 * Cashfree, which takes the couple's payment. See `services/cashfree.service.ts`
 * and ADR-0011.
 *
 * Payment is on only when the app id and the secret key are both set. The
 * secret key IS a secret: it comes from Secret Manager at runtime. The app id
 * is not; it is a GitHub variable. `CASHFREE_ENV` picks the test (`sandbox`)
 * or the live (`production`) account; the keys must belong to the same one.
 */
const cashfreeAppId = optional(process.env.CASHFREE_APP_ID, '').trim();
const cashfreeSecretKey = optional(process.env.CASHFREE_SECRET_KEY, '').trim();
const cashfreeEnvironment = oneOf(
  'CASHFREE_ENV',
  process.env.CASHFREE_ENV?.trim(),
  ['sandbox', 'production'] as const,
  'sandbox',
);

/**
 * Razorpay, the second payment provider. See `services/razorpay.service.ts`
 * and ADR-0012.
 *
 * On only when the key id and the key secret are both set. The key secret and
 * the webhook secret ARE secrets: they come from Secret Manager at runtime.
 * The key id is not; it is a GitHub variable. Its prefix says which mode the
 * keys belong to (`rzp_test_` or `rzp_live_`), so there is no separate
 * environment variable to get out of step with them.
 */
const razorpayKeyId = pattern(
  'RAZORPAY_KEY_ID',
  process.env.RAZORPAY_KEY_ID?.trim(),
  /^rzp_(test|live)_[A-Za-z0-9]+$/,
  'must be a Razorpay key id (rzp_test_... or rzp_live_...)',
);
const razorpayKeySecret = optional(process.env.RAZORPAY_KEY_SECRET, '').trim();
const razorpayWebhookSecret = optional(process.env.RAZORPAY_WEBHOOK_SECRET, '').trim();
const razorpayEnabled = razorpayKeyId !== '' && razorpayKeySecret !== '';

/**
 * Which provider takes the payment. `auto` (the default) uses Cashfree when it
 * is configured, else Razorpay. Naming one uses only that one: payment stays
 * off if its keys are missing, rather than falling back silently.
 */
const paymentProviderChoice = oneOf(
  'PAYMENT_PROVIDER',
  process.env.PAYMENT_PROVIDER?.trim(),
  ['auto', 'cashfree', 'razorpay'] as const,
  'auto',
);
const cashfreeEnabled = cashfreeAppId !== '' && cashfreeSecretKey !== '';

function activePaymentProvider(): 'cashfree' | 'razorpay' | null {
  if (paymentProviderChoice === 'cashfree') return cashfreeEnabled ? 'cashfree' : null;
  if (paymentProviderChoice === 'razorpay') return razorpayEnabled ? 'razorpay' : null;
  if (cashfreeEnabled) return 'cashfree';
  return razorpayEnabled ? 'razorpay' : null;
}

const nodeEnv = oneOf('NODE_ENV', process.env.NODE_ENV, VALID_NODE_ENVS, 'development');

// Order matters below: the database id and bucket name default to values
// derived from the slug and project id, so those two are resolved first.
const appSlug = pattern(
  'APP_SLUG',
  process.env.APP_SLUG,
  SLUG_PATTERN,
  'must start with a lowercase letter and contain only lowercase letters, digits and hyphens (max 49 characters)',
);

const gcpProjectId = pattern(
  'GCP_PROJECT_ID',
  process.env.GCP_PROJECT_ID,
  PROJECT_ID_PATTERN,
  'must be a valid GCP project id (6-30 lowercase letters, digits and hyphens)',
);

const firestoreDatabaseId = pattern(
  'FIRESTORE_DATABASE_ID',
  process.env.FIRESTORE_DATABASE_ID,
  DATABASE_ID_PATTERN,
  'must be 4-63 lowercase letters, digits and hyphens, or the literal "(default)"',
  appSlug === '' ? '' : `${appSlug}-db`,
);

const gcsBucket = pattern(
  'GCS_BUCKET',
  process.env.GCS_BUCKET,
  BUCKET_PATTERN,
  'must be 3-63 lowercase letters, digits, hyphens and underscores, starting and ending alphanumerically',
  appSlug === '' || gcpProjectId === '' ? '' : `${gcpProjectId}-${appSlug}-media`,
);

/**
 * Firebase web configuration.
 *
 * Every value here is NEXT_PUBLIC_, which means two things. It is inlined into
 * the JavaScript bundle at build time, so changing it on the Cloud Run service
 * does nothing until the image is rebuilt. And it is public, so it must never
 * carry anything that grants access on its own — see trap 8.
 *
 * The project id defaults to GCP_PROJECT_ID. A Firebase project IS a GCP
 * project, so they are the same string unless auth lives in a separate project.
 */
const firebaseApiKey = pattern(
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  FIREBASE_API_KEY_PATTERN,
  'must be a Firebase web API key (starts with "AIza", 39 characters)',
);

const firebaseProjectId = pattern(
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  PROJECT_ID_PATTERN,
  'must be a valid GCP project id (6-30 lowercase letters, digits and hyphens)',
  gcpProjectId,
);

const firebaseAuthDomain = pattern(
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  FIREBASE_AUTH_DOMAIN_PATTERN,
  'must be a bare hostname with no scheme or path, e.g. my-project.firebaseapp.com',
  firebaseProjectId === '' ? '' : `${firebaseProjectId}.firebaseapp.com`,
);

const firebaseAppId = pattern(
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  FIREBASE_APP_ID_PATTERN,
  'must be a Firebase web app id, e.g. 1:1234567890:web:0a1b2c3d4e5f',
);

/**
 * Sign-in is available only when the whole web config resolved.
 *
 * This is derived rather than a separate flag on purpose, and it FAILS SECURE:
 * an app built without Firebase configuration cannot mint a session, so every
 * write route answers 401 and nothing can be created or uploaded. A template
 * user who never sets these up gets a read-only public app, not an open one.
 *
 * It is fixed at BUILD time, because these are NEXT_PUBLIC_ values. Adding
 * them to a running Cloud Run service enables nothing until you rebuild.
 */
/**
 * Google Ads measurement (ADR-0013). Public, like the Firebase config: these
 * ids appear in the page source of every site that uses them. Fixed at BUILD
 * time (trap 8). An empty id turns the tag and the consent banner off.
 */
const googleAdsId = pattern(
  'NEXT_PUBLIC_GOOGLE_ADS_ID',
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
  GOOGLE_ADS_ID_PATTERN,
  'must be a Google Ads conversion id, e.g. AW-123456789',
);

const googleAdsSignupLabel = pattern(
  'NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL',
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL,
  GOOGLE_ADS_LABEL_PATTERN,
  'must be a Google Ads conversion label (4-64 letters, digits, _ and -)',
);

const googleAdsPurchaseLabel = pattern(
  'NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL',
  process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL,
  GOOGLE_ADS_LABEL_PATTERN,
  'must be a Google Ads conversion label (4-64 letters, digits, _ and -)',
);

const authEnabled =
  firebaseApiKey !== '' &&
  firebaseAuthDomain !== '' &&
  firebaseProjectId !== '' &&
  firebaseAppId !== '';

export const env = {
  /** Node runtime mode. Set by the tooling; never override it by hand. */
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',

  /** Injected by Cloud Run. The server MUST bind to this, not a hardcoded 3000. */
  port: port('PORT', process.env.PORT, 3000),

  /** Interface to bind. `0.0.0.0` is required inside a container. */
  host: optional(process.env.HOSTNAME, '0.0.0.0'),

  /** Verbosity floor for application logs. */
  logLevel: oneOf('LOG_LEVEL', process.env.LOG_LEVEL, VALID_LOG_LEVELS, 'info'),

  /** Public origin of the deployment, used for canonical URLs and metadata. */
  appUrl: optional(process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:3000'),

  /** Human-readable name shown in the UI and in page titles. */
  appName: optional(process.env.NEXT_PUBLIC_APP_NAME, 'vivah.online'),

  /**
   * Root domain for couple invites, e.g. `vivah.online`. A request for
   * `<slug>.<rootDomain>` renders that couple's invite; see `proxy.ts` and
   * `cloud/domain-routing.md`. Empty turns invite routing off, so `localhost`
   * and the `*.run.app` URL always show the product site.
   */
  rootDomain,

  /**
   * The Google account that is the admin's first sign-in step for `/admin`.
   * Lowercase. Empty turns the admin dashboard off. See ADR-0008.
   */
  adminEmail,

  /**
   * The phone that receives the admin's second-step OTP, in E.164. Empty
   * turns the admin dashboard off. See ADR-0008.
   */
  adminPhone,

  /** True when both admin factors are set, so `/admin` can exist at all. */
  adminEnabled: adminEmail !== '' && adminPhone !== '',

  /**
   * WhatsApp Cloud API settings for the preview-link message. Server only:
   * the token is a secret. `enabled` is true only when all three of token,
   * phone number id and template name are set.
   */
  whatsapp: {
    enabled:
      whatsappAccessToken !== '' && whatsappPhoneNumberId !== '' && whatsappTemplateName !== '',
    accessToken: whatsappAccessToken,
    phoneNumberId: whatsappPhoneNumberId,
    templateName: whatsappTemplateName,
    templateLanguage: whatsappTemplateLanguage,
    graphVersion: whatsappGraphVersion,
  },

  /**
   * Telegram notices to the team about new previews. Server only: the token
   * is a secret. `enabled` is true only when the token and chat id are set.
   */
  telegram: {
    enabled: telegramBotToken !== '' && telegramChatId !== '',
    botToken: telegramBotToken,
    chatId: telegramChatId,
  },

  /**
   * Cashfree payment settings. Server only: the secret key is a secret.
   * `enabled` is true only when the app id and the secret key are both set.
   */
  cashfree: {
    enabled: cashfreeEnabled,
    appId: cashfreeAppId,
    secretKey: cashfreeSecretKey,
    environment: cashfreeEnvironment,
  },

  /**
   * Razorpay payment settings. Server only: both secrets are secrets.
   * `enabled` is true only when the key id and the key secret are both set.
   * `environment` follows the key id's prefix.
   */
  razorpay: {
    enabled: razorpayEnabled,
    keyId: razorpayKeyId,
    keySecret: razorpayKeySecret,
    webhookSecret: razorpayWebhookSecret,
    environment: razorpayKeyId.startsWith('rzp_live_')
      ? ('production' as const)
      : ('sandbox' as const),
  },

  /**
   * The provider the pay button uses, or `null` when payment is off. From
   * `PAYMENT_PROVIDER` and which keys are set. ADR-0012.
   */
  paymentProvider: activePaymentProvider(),

  /** Commit SHA of the running build. Surfaced by /api/health for traceability. */
  appVersion: optional(process.env.NEXT_PUBLIC_APP_VERSION, 'dev'),

  /**
   * Machine name of this application. One slug names the Cloud Run service,
   * the runtime service account, the Firestore database and the bucket, so a
   * second app in the same project never collides with this one.
   * Set by `scripts/rename-project.sh`.
   */
  appSlug,

  /** GCP project id. Injected by the deploy workflow; absent locally. */
  gcpProjectId,

  /** Cloud Run region, e.g. `asia-south1`. */
  gcpRegion: optional(process.env.GCP_REGION, ''),

  /**
   * Firestore database this app reads and writes. A NAMED database, never
   * `(default)`: the runtime service account is granted `roles/datastore.user`
   * under an IAM condition pinned to this exact name, so one app in a shared
   * project cannot reach another app's data.
   * Defaults to `<app-slug>-db`.
   */
  firestoreDatabaseId,

  /**
   * Cloud Storage bucket for user uploads. Defaults to
   * `<project-id>-<app-slug>-media`. Point this at `<bucket>-dev` locally —
   * see docs/local-development.md.
   */
  gcsBucket,

  /**
   * Set by the Firestore emulator (`pnpm db:emulator`). When present, the
   * Firestore client talks to the emulator and sends no credentials. Never set
   * this in a deployed environment — it would silently route production reads
   * to a host that does not exist.
   */
  firestoreEmulatorHost: optional(process.env.FIRESTORE_EMULATOR_HOST, ''),

  /**
   * Opt-in for the dependency checks on `/api/health?deep=1`. Off by default,
   * and deliberately so: a probe that fails when Firestore blips would make
   * Cloud Run kill healthy containers and amplify the outage. Turn it on only
   * for a dashboard or an uptime check, never for the platform's own probe.
   */
  healthDeepChecksEnabled: boolean(
    'HEALTH_DEEP_CHECKS_ENABLED',
    process.env.HEALTH_DEEP_CHECKS_ENABLED,
    false,
  ),

  /**
   * Firebase web configuration, safe to read from a Client Component.
   *
   * Assembled into a `FirebaseOptions` object by `lib/firebase-config.ts`.
   * Empty strings when sign-in is not configured; check `authEnabled` first.
   */
  firebase: {
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    projectId: firebaseProjectId,
    appId: firebaseAppId,
  },

  /**
   * True when the Firebase web config is complete. False closes every write
   * route, because nothing can sign in. Fixed at build time — see above.
   */
  authEnabled,

  /**
   * Google Ads: the conversion id and the label of each conversion action.
   * Empty strings when not configured; `id === ''` means no tag at all.
   */
  googleAds: {
    id: googleAdsId,
    signupLabel: googleAdsSignupLabel,
    purchaseLabel: googleAdsPurchaseLabel,
  },

  /**
   * Session cookie lifetime. Firebase caps a session cookie at 14 days, so
   * that is the ceiling here too; asking for more is a configuration error
   * rather than something to clamp silently.
   */
  authSessionMaxAgeDays: integer(
    'AUTH_SESSION_MAX_AGE_DAYS',
    process.env.AUTH_SESSION_MAX_AGE_DAYS,
    14,
    1,
    14,
  ),

  /**
   * Check every session against revoked refresh tokens.
   *
   * Off by default: it costs a call to Identity Platform on EVERY verified
   * request, which is a per-request dependency on an external service in the
   * hot path. On, a "sign out everywhere" takes effect immediately instead of
   * at the next session refresh. Turn it on for an app handling money or
   * health data; leave it off for most.
   */
  authCheckRevoked: boolean('AUTH_CHECK_REVOKED', process.env.AUTH_CHECK_REVOKED, false),

  /**
   * UTC time of the last deploy (ISO-8601), injected by the deploy workflow.
   * Empty locally. Surfaced by /api/health, rendered in IST, so a deploy is
   * visible without opening GitHub.
   */
  deployedAt: optional(process.env.DEPLOYED_AT, ''),
} as const;

/**
 * Variables the data layer cannot work without.
 *
 * Checked only in production, and only on the server:
 *   - locally and in tests they are optional, so `pnpm dev` and `pnpm test`
 *     work on a clean checkout with no Google Cloud account;
 *   - the guard is skipped during `next build` (see below);
 *   - the guard is skipped in the browser because Next.js replaces a
 *     non-`NEXT_PUBLIC_` read with `undefined` in the client bundle. Without
 *     the guard, a Client Component that ever imported this file would throw
 *     on every page load in production while the server was perfectly healthy.
 *
 * The deploy workflow always sets all four, so a missing one means a
 * misconfigured pipeline. Failing here makes Cloud Run reject the revision and
 * keep serving the previous one — which is the outcome you want.
 *
 * It is also skipped during `next build`. That is not a loophole, it is the
 * whole distinction: `next build` runs with NODE_ENV=production and imports
 * every route to collect page metadata, so without the phase check the Docker
 * builder stage and CI would demand production database configuration in order
 * to compile. Only `NEXT_PUBLIC_*` values matter at build time; everything here
 * is read at runtime. Next.js sets NEXT_PHASE for exactly this purpose.
 *
 * Building an app from this template that needs no database? Delete this block
 * and the four fields above it, and say so in the PR.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const REQUIRED_IN_PRODUCTION: ReadonlyArray<readonly [string, string]> = [
  ['APP_SLUG', appSlug],
  ['GCP_PROJECT_ID', gcpProjectId],
  ['FIRESTORE_DATABASE_ID', firestoreDatabaseId],
  ['GCS_BUCKET', gcsBucket],
];

if (nodeEnv === 'production' && typeof window === 'undefined' && !isBuildPhase) {
  for (const [name, value] of REQUIRED_IN_PRODUCTION) {
    if (value === '') {
      issues.push(`${name} is required in production but is missing or was rejected above`);
    }
  }
}

/**
 * `NEXT_PUBLIC_APP_URL` is intentionally NOT required. Cloud Run only generates
 * the service URL after the first deploy, and `NEXT_PUBLIC_*` values are inlined
 * at build time — so making it mandatory would fail the first deploy's health
 * check before the URL can exist. `appUrl` above falls back to a safe default,
 * and the deploy workflow inlines the real value on the next build.
 *
 * The `NEXT_PUBLIC_FIREBASE_*` values are intentionally NOT required either,
 * and that omission is the safe one. A missing web config makes `authEnabled`
 * false, which closes every write route — the app still boots and still serves
 * public reads. Requiring them would instead refuse to start, which turns a
 * half-finished Firebase setup into an outage. Fail closed, not down.
 *
 * Add further production-required variables to the list above as the project
 * grows, and document each one in `.env.example`.
 */

if (issues.length > 0) {
  throw new EnvValidationError(issues);
}

export type Env = typeof env;
