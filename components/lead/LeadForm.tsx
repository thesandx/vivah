'use client';

import { useEffect, useRef, useState } from 'react';

import { PhoneNumberInput } from '@/components/auth/PhoneNumberInput';
import { MakingProgress } from '@/components/lead/MakingProgress';
import { SendMoment } from '@/components/lead/SendMoment';
import { CalendarArt, HeartGlyph, HeartsArt } from '@/components/lead/SignupArt';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FieldError } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { DEFAULT_DIAL_COUNTRY, toE164 } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { daysUntil, foreverStartsLine, formatWeddingDate, todayInIndia } from '@/lib/wedding-date';

/**
 * The home page sign-up card, in two steps so a couple is invested before we
 * ask for a phone number:
 *
 * 1. The two names. The card shows them joined by a heart as they type, and
 *    the button wakes up once both are there.
 * 2. The wedding day and the WhatsApp number. A picked day turns into "Your
 *    forever starts in 30 days".
 *
 * Then the card shows the website being made, step by step, while
 * `POST /api/leads` creates the preview. An envelope zooms away, a tick takes
 * its place, and the preview opens in this browser, which also binds the
 * preview to it.
 *
 * A Client Component because it holds state and handles submit; the page
 * around it stays a Server Component. The server validates everything again
 * with `lib/lead-schema.ts`; the checks here are a courtesy for a fast answer.
 */

/** The longest a name may be. Must match MAX_NAME_LENGTH in lib/lead-schema.ts. */
const MAX_NAME_LENGTH = 60;

/** How long each "making" step shows before it ticks. The request runs meanwhile. */
const STEP_MS = 850;
/** How long the envelope flies. Matches `--animate-fly-away` in styles/globals.css. */
const FLY_MS = 760;
/** How long the tick shows before the preview opens. */
const SENT_MS = 1400;

/*
 * The line under the tick. The preview opens on screen until the WhatsApp
 * templates are approved, so it promises only that. When the link goes by
 * WhatsApp, this becomes "Sent to your WhatsApp".
 */
const SENT_DETAIL = 'Opening your preview now.';

type Step = 'names' | 'details' | 'making' | 'flying' | 'sent';
type FieldName = 'bride' | 'groom' | 'weddingDate' | 'phone' | 'consent';
type FieldErrors = Partial<Record<FieldName, string>>;

interface ErrorBody {
  message?: string;
  fields?: Record<string, string>;
}

const STEP_MOTION = { none: '', next: 'animate-slide-in-next', back: 'animate-slide-in-back' };

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface LeadFormProps {
  /** The id of the card's heading: the home page links to it. Default: `start`. */
  headingId?: string;
  className?: string;
}

export function LeadForm({ headingId = 'start', className }: LeadFormProps): React.JSX.Element {
  const [bride, setBride] = useState('');
  const [groom, setGroom] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [dateLater, setDateLater] = useState(false);
  const [country, setCountry] = useState(DEFAULT_DIAL_COUNTRY);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');

  const [step, setStep] = useState<Step>('names');
  const [direction, setDirection] = useState<keyof typeof STEP_MOTION>('none');
  const [done, setDone] = useState(0);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Focus follows the step, so a screen reader hears the new heading. Not on
  // first render: the card must not steal focus when the page loads.
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) return;
    document.getElementById(headingId)?.focus({ preventScroll: true });
  }, [step, headingId]);

  const brideName = bride.trim();
  const groomName = groom.trim();
  const namesReady = brideName !== '' && groomName !== '';
  const days = !dateLater && weddingDate !== '' ? daysUntil(weddingDate, todayInIndia()) : null;
  const forever = days === null ? null : foreverStartsLine(days);
  const detailsReady = (dateLater || weddingDate !== '') && phone.trim() !== '';

  const makingSteps = [
    `Writing ${brideName} & ${groomName} in gold`,
    dateLater ? 'Saving a seat for your date' : 'Circling your day on the calendar',
    'Hanging the marigolds',
    'Sealing your invite',
  ] as const;

  function go(next: Step, way: keyof typeof STEP_MOTION): void {
    moved.current = true;
    setDirection(way);
    setStep(next);
  }

  // Tick the "making" steps one by one while the request runs.
  useEffect(() => {
    if (step !== 'making' || done >= makingSteps.length) return;
    const timer = window.setTimeout(
      () => setDone((count) => count + 1),
      prefersReducedMotion() ? STEP_MS / 3 : STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [step, done, makingSteps.length]);

  // Once every step is ticked and the server answered, the envelope flies.
  const view: Step =
    step === 'making' && done >= makingSteps.length && previewPath !== null ? 'flying' : step;

  useEffect(() => {
    if (view === 'flying') {
      const timer = window.setTimeout(() => setStep('sent'), prefersReducedMotion() ? 0 : FLY_MS);
      return () => window.clearTimeout(timer);
    }
    if (view === 'sent' && previewPath !== null) {
      const timer = window.setTimeout(() => window.location.assign(previewPath), SENT_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [view, previewPath]);

  function handleNames(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!namesReady) return;
    setFieldErrors({});
    setError(null);
    go('details', 'next');
  }

  function handleDetails(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (days !== null && days < 0) errors.weddingDate = 'Pick a date that is not in the past.';
    const phoneResult = toE164(country, phone);
    if (!phoneResult.ok) errors.phone = phoneResult.message;
    if (!consent) errors.consent = 'Tick the box so we can send your preview on WhatsApp.';
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setDone(0);
    setPreviewPath(null);
    go('making', 'next');
    void submit();
  }

  async function submit(): Promise<void> {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bride,
          groom,
          weddingDate: dateLater || weddingDate === '' ? null : weddingDate,
          countryIso: country,
          phone,
          consent,
          ...(website !== '' && { website }),
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ErrorBody;
        const fields = (body.fields ?? {}) as FieldErrors;
        setFieldErrors(fields);
        setError(body.message ?? `The request failed with status ${response.status}.`);
        // A problem with a name belongs on the first step.
        go(fields.bride !== undefined || fields.groom !== undefined ? 'names' : 'details', 'back');
        return;
      }

      const body = (await response.json()) as { previewPath: string };
      setPreviewPath(body.previewPath);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.name !== 'TimeoutError'
          ? caught.message
          : 'The request took too long. Check your connection and try again.',
      );
      go('details', 'back');
    }
  }

  const errorAlert = error !== null && (
    <Alert tone="danger" title="Your website was not created.">
      {error}
    </Alert>
  );

  return (
    <div className={cn('flex w-full flex-col', className)}>
      {step === 'names' && (
        <form
          key="names"
          onSubmit={handleNames}
          className={cn('flex flex-col gap-4', STEP_MOTION[direction])}
          noValidate
        >
          <header className="flex flex-col items-center gap-2 text-center">
            <HeartsArt />
            <p className="text-small text-ink-soft">Step 1 of 2</p>
            <h2 id={headingId} tabIndex={-1} className="text-heading scroll-mt-24 outline-none">
              The two of you
            </h2>
            <p className="text-small text-ink-soft">
              Your website starts with your names. See it free, and pay only when you love it.
            </p>
          </header>
          <Input
            label="Bride's name"
            name="bride"
            autoComplete="off"
            value={bride}
            onChange={(event) => setBride(event.target.value)}
            maxLength={MAX_NAME_LENGTH}
            required
            {...(fieldErrors.bride !== undefined && { error: fieldErrors.bride })}
          />
          <Input
            label="Groom's name"
            name="groom"
            autoComplete="off"
            value={groom}
            onChange={(event) => setGroom(event.target.value)}
            maxLength={MAX_NAME_LENGTH}
            required
            {...(fieldErrors.groom !== undefined && { error: fieldErrors.groom })}
          />
          {/* The names, joined, as they will read on the website. */}
          <p
            className={cn(
              'text-heading flex min-h-8 flex-wrap items-center justify-center gap-2 text-center break-all',
              !namesReady && 'invisible',
            )}
            aria-hidden={!namesReady}
          >
            <span>{brideName}</span>
            {namesReady && <HeartGlyph className="animate-pop" />}
            <span>{groomName}</span>
          </p>
          {errorAlert}
          <Button type="submit" size="lg" block disabled={!namesReady}>
            Begin our story
          </Button>
        </form>
      )}

      {step === 'details' && (
        <form
          key="details"
          onSubmit={handleDetails}
          className={cn('flex flex-col gap-4', STEP_MOTION[direction])}
          noValidate
        >
          <header className="flex flex-col items-center gap-2 text-center">
            <CalendarArt isoDate={dateLater || weddingDate === '' ? null : weddingDate} />
            <p className="text-small text-ink-soft">Step 2 of 2</p>
            <h2 id={headingId} tabIndex={-1} className="text-heading scroll-mt-24 outline-none">
              Your big day
            </h2>
            <p className="text-small text-ink-soft">
              The date starts a countdown on your website. Your preview comes to your WhatsApp.
            </p>
          </header>
          <Input
            label="Wedding date"
            name="weddingDate"
            type="date"
            min={todayInIndia()}
            value={dateLater ? '' : weddingDate}
            disabled={dateLater}
            onChange={(event) => {
              setWeddingDate(event.target.value);
              setFieldErrors(({ weddingDate: _, ...rest }) => rest);
            }}
            {...(fieldErrors.weddingDate !== undefined && { error: fieldErrors.weddingDate })}
          />
          <Checkbox
            label="I'll add the date later"
            checked={dateLater}
            onChange={(event) => setDateLater(event.target.checked)}
          />
          {(forever !== null || dateLater) && (
            <div
              key={forever ?? 'later'}
              className="bg-brand-soft border-line rounded-input animate-rise-in flex flex-col items-center gap-1 border-2 p-4 text-center"
              aria-live="polite"
            >
              <p className="text-heading">
                {forever ?? 'Your forever is on its way'}{' '}
                <HeartGlyph className="align-middle" />
              </p>
              <p className="text-small text-ink-soft">
                {forever !== null
                  ? formatWeddingDate(weddingDate)
                  : 'Add the date whenever you are ready.'}
              </p>
            </div>
          )}
          <PhoneNumberInput
            label="WhatsApp number"
            country={country}
            onCountryChange={setCountry}
            value={phone}
            onChange={(value) => {
              setPhone(value);
              setFieldErrors(({ phone: _, ...rest }) => rest);
            }}
            error={fieldErrors.phone}
          />
          <Checkbox
            label="Send my preview on WhatsApp"
            hint="We use this number only for your invite."
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              setFieldErrors(({ consent: _, ...rest }) => rest);
            }}
          />
          {fieldErrors.consent !== undefined && (
            <FieldError id="lead-consent-error">{fieldErrors.consent}</FieldError>
          )}

          {/* Honeypot: hidden from people and from screen readers, so only a bot fills it. */}
          <div aria-hidden="true" className="hidden">
            <label>
              Website
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>
          </div>

          {errorAlert}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="w-14 shrink-0 px-0!"
              aria-label="Back to your names"
              onClick={() => {
                setError(null);
                go('names', 'back');
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none">
                <path
                  d="M19 12H5m6-6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            <Button type="submit" size="lg" block disabled={!detailsReady}>
              Make my website
            </Button>
          </div>
        </form>
      )}

      {view === 'making' && (
        <div key="making" className={STEP_MOTION[direction]}>
          <MakingProgress
            title={`Making ${brideName} & ${groomName}'s website`}
            headingId={headingId}
            steps={makingSteps}
            done={done}
          />
        </div>
      )}

      {(view === 'flying' || view === 'sent') && (
        <SendMoment
          phase={view}
          headingId={headingId}
          title="Your website is ready"
          detail={SENT_DETAIL}
        />
      )}
    </div>
  );
}
