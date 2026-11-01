'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { reportMetaConversion } from '@/components/ads/MetaPixel';
import {
  AddressChoice,
  type AddressValue,
  chosenSlug,
  CUSTOM,
  initialAddress,
  type SlugCheck,
} from '@/components/invite/AddressChoice';
import { FunctionChoice } from '@/components/lead/FunctionChoice';
import { MakingProgress } from '@/components/lead/MakingProgress';
import { SendMoment } from '@/components/lead/SendMoment';
import {
  AddressArt,
  CalendarArt,
  FestivitiesArt,
  HeartGlyph,
  HeartsArt,
  SongArt,
} from '@/components/lead/SignupArt';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlayButton } from '@/components/ui/PlayButton';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { useGoogleAds } from '@/hooks/useGoogleAds';
import { type SignupPlace, useVisitTracking } from '@/hooks/useVisitTracking';
import { capitalizeName } from '@/lib/guest-name';
import { indianMobileDigits, toE164 } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { daysUntil, foreverStartsLine, formatWeddingDate, todayInIndia } from '@/lib/wedding-date';
import type { FunctionKind } from '@/lib/wedding-functions';
import { parseSongSlot, type SongOption, type SongSlot } from '@/lib/wedding-songs';

/**
 * The home page sign-up card, in steps so a couple is invested before we ask
 * for a phone number:
 *
 * 1. The two names. The card shows them joined by a heart as they type, and
 *    the button wakes up once both are there.
 * 2. The wedding day and the WhatsApp number. A picked day turns into "Your
 *    forever starts in 30 days".
 * 3. The functions besides the wedding: tilak, haldi, mehndi, sangeet and
 *    reception, as pills to tick. Any number, or none. The preview shows a
 *    card for each; the dates and venues come later, from the dashboard.
 * 4. The address of their website: `radha-shyam.vivah.online`, or one they
 *    type. `GET /api/addresses` offers free ones and checks a typed one. The
 *    lead stores the choice; publishing on the preview page reserves it.
 * 5. The song guests can play on their site, from the ones an admin added
 *    in `/admin` (`GET /api/songs`). With no songs, the card has 4 steps.
 *
 * Then the card shows the website being made, step by step, while
 * `POST /api/leads` creates the preview. An envelope zooms away, a tick takes
 * its place, and the preview opens in this browser, which also binds the
 * preview to it.
 *
 * `layout="screen"` is the full-screen form that `vivah.online/#details`
 * opens (`SignupScreen`): a bar of the steps sits above each step, and the
 * step's button stays pinned at the bottom of the screen, in thumb reach.
 * From step 2 the back arrow moves to the top left, into `backSlot`.
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
 * The line under the tick. The preview always opens on screen. The WhatsApp
 * line shows only when the server says WhatsApp accepted the link, so the
 * card never promises a message that was not sent.
 */
const SENT_DETAIL = 'Opening your preview now.';
const SENT_DETAIL_WHATSAPP = 'Sent to your WhatsApp. Opening your preview now.';

type Step = 'names' | 'details' | 'functions' | 'address' | 'song' | 'making' | 'flying' | 'sent';
const PAST_DATE_ERROR = 'Pick today or a later date.';

type FieldName = 'bride' | 'groom' | 'weddingDate' | 'phone' | 'functions' | 'slug' | 'songSlot';
type FieldErrors = Partial<Record<FieldName, string>>;

interface ErrorBody {
  message?: string;
  fields?: Record<string, string>;
}

/** How long an address call may take. */
const ADDRESS_TIMEOUT_MS = 8000;

/** Shown until the server names the root domain. */
const DEFAULT_DOMAIN_LABEL = 'vivah.online';

/** Is this typed address free? Module level, so it is stable across renders. */
async function checkAddress(slug: string): Promise<SlugCheck> {
  const response = await fetch(`/api/addresses?slug=${encodeURIComponent(slug)}`, {
    signal: AbortSignal.timeout(ADDRESS_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Checking the address failed with ${response.status}.`);
  return (await response.json()) as SlugCheck;
}

const STEP_MOTION = { none: '', next: 'animate-slide-in-next', back: 'animate-slide-in-back' };

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface LeadFormProps {
  /** The id of the card's heading: the home page links to it. Default: `start`. */
  headingId?: string;
  /** Which card this is, for the home page's visit report (ADR-0014). Default: `hero`. */
  place?: SignupPlace;
  /**
   * `card` sits in the page or the dialog. `screen` fills a full-screen
   * sheet: the steps show as a bar, and each step's button is pinned to the
   * bottom. Default: `card`.
   */
  layout?: 'card' | 'screen';
  /**
   * On the full screen, where the back arrow goes: top left, in the screen's
   * band. The step's own back button then hides. Default: none.
   */
  backSlot?: HTMLElement | null;
  className?: string;
}

/** The steps the visit report counts, by the card's step names. */
const TRACKED_STEPS = {
  details: 'details',
  functions: 'functions',
  address: 'address',
  song: 'song',
} as const;

export function LeadForm({
  headingId = 'start',
  place = 'hero',
  layout = 'card',
  backSlot = null,
  className,
}: LeadFormProps): React.JSX.Element {
  const tracking = useVisitTracking();
  const screen = layout === 'screen';
  /** On the full screen, the back arrow moves to the top. */
  const topBack = screen && backSlot !== null;
  const [bride, setBride] = useState('');
  const [groom, setGroom] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [functions, setFunctions] = useState<FunctionKind[]>([]);
  const [address, setAddress] = useState<AddressValue>(() => initialAddress([]));
  /** Free addresses for these names; `null` while they load. */
  const [suggestions, setSuggestions] = useState<readonly string[] | null>(null);
  const [domainLabel, setDomainLabel] = useState(DEFAULT_DOMAIN_LABEL);
  /** The songs to choose from; `null` while they load. */
  const [songs, setSongs] = useState<readonly SongOption[] | null>(null);
  const [songSlot, setSongSlot] = useState<SongSlot | null>(null);
  const songsAsked = useRef(false);
  /** The names the suggestions were made for, so a return visit does not ask again. */
  const suggestedFor = useRef<string | null>(null);

  const [step, setStep] = useState<Step>('names');
  const [direction, setDirection] = useState<keyof typeof STEP_MOTION>('none');
  const [done, setDone] = useState(0);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const ads = useGoogleAds();
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Focus follows the step, so a screen reader hears the new heading. Not on
  // first render: the card must not steal focus when the page loads.
  //
  // The steps differ in height, so on a phone a shorter step can leave the
  // card above the screen. When the card's top is out of view, or below the
  // middle of the screen, scroll it back to the top (under the sticky header,
  // through `scroll-mt-24`). In the dialog this scrolls the dialog instead.
  const moved = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  // The form's own page (`/details`) is static HTML, so the fields show
  // before the JavaScript runs, and a quick visitor can type into them. React
  // keeps that text while it hydrates, but the next render would set the
  // fields back to the empty state. So the names typed so far become the
  // state here, before that render. A layout effect, so nothing flickers.
  useLayoutEffect(() => {
    const card = root.current;
    if (card === null) return;
    const typed = (name: string): string =>
      card.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value ?? '';
    const earlyBride = typed('bride');
    const earlyGroom = typed('groom');
    if (earlyBride !== '') setBride(earlyBride);
    if (earlyGroom !== '') setGroom(earlyGroom);
    // A focus before hydration fired no `onFocus`; count the start here.
    if (card.contains(document.activeElement) || earlyBride !== '' || earlyGroom !== '') {
      tracking.trackStep('started', place);
    }
    // Once, on the first render only.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads the server-drawn fields once
  }, []);

  useEffect(() => {
    if (!moved.current) return;
    document.getElementById(headingId)?.focus({ preventScroll: true });
    const card = root.current;
    if (card === null) return;
    const top = card.getBoundingClientRect().top;
    const margin = Number.parseFloat(window.getComputedStyle(card).scrollMarginTop) || 0;
    if (top < margin || top > window.innerHeight / 2) {
      card.scrollIntoView({
        block: 'start',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }, [step, headingId]);

  const brideName = bride.trim();
  const groomName = groom.trim();
  const namesReady = brideName !== '' && groomName !== '';
  const days = weddingDate !== '' ? daysUntil(weddingDate, todayInIndia()) : null;
  const forever = days === null ? null : foreverStartsLine(days);
  const detailsReady = weddingDate !== '' && phone.length === 10;
  const slug = chosenSlug(address);
  const addressReady = suggestions !== null && slug !== null;
  // Until the list arrives, the card counts on the song step.
  const hasSongStep = songs === null || songs.length > 0;
  const totalSteps = hasSongStep ? 5 : 4;
  const lastStep: Step = hasSongStep ? 'song' : 'address';
  const song = songs?.find((option) => option.slot === songSlot) ?? null;
  const songReady = songs !== null && (songs.length === 0 || song !== null);

  const makingSteps = [
    `Writing ${brideName} & ${groomName} in gold`,
    'Circling your day on the calendar',
    `Putting up your nameplate at ${slug ?? 'your address'}.${domainLabel}`,
    song === null ? 'Sealing your invite' : `Cueing up ${song.name}`,
  ] as const;

  function go(next: Step, way: keyof typeof STEP_MOTION): void {
    if (next in TRACKED_STEPS) {
      tracking.trackStep(TRACKED_STEPS[next as keyof typeof TRACKED_STEPS], place);
    }
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
    if (!songsAsked.current) void loadSongs();
  }

  /** Asks once for the songs, early, so step 4 is ready when the couple gets there. */
  async function loadSongs(): Promise<void> {
    songsAsked.current = true;
    let listed: readonly SongOption[] = [];
    try {
      const response = await fetch('/api/songs', {
        signal: AbortSignal.timeout(ADDRESS_TIMEOUT_MS),
      });
      if (response.ok) {
        const body = (await response.json()) as { songs?: unknown };
        if (Array.isArray(body.songs)) listed = body.songs as SongOption[];
      }
    } catch {
      // No songs: the card skips the song step.
    }
    setSongs(listed);
    setSongSlot((previous) => previous ?? listed[0]?.slot ?? null);
  }

  function handleDetails(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (weddingDate === '') errors.weddingDate = 'Choose your wedding date.';
    else if (days !== null && days < 0) errors.weddingDate = PAST_DATE_ERROR;
    const phoneResult = toE164('IN', phone);
    if (!phoneResult.ok) errors.phone = phoneResult.message;
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    go('functions', 'next');
    const names = `${brideName}\n${groomName}`;
    if (suggestedFor.current !== names) void loadSuggestions(names);
  }

  /**
   * Asks for free addresses for these names. A ready-made choice that is no
   * longer offered moves to the new first one; a typed address stays.
   */
  async function loadSuggestions(names: string): Promise<void> {
    suggestedFor.current = names;
    setSuggestions(null);
    let offered: readonly string[] = [];
    try {
      const query = new URLSearchParams({ bride: brideName, groom: groomName });
      const response = await fetch(`/api/addresses?${query.toString()}`, {
        signal: AbortSignal.timeout(ADDRESS_TIMEOUT_MS),
      });
      if (response.ok) {
        const body = (await response.json()) as { suggestions: string[]; domainLabel: string };
        offered = body.suggestions;
        setDomainLabel(body.domainLabel);
      }
    } catch {
      // No suggestions: the couple types their own, and that is checked.
    }
    // The names changed while this was asked. A newer call answers instead.
    if (suggestedFor.current !== names) return;
    setSuggestions(offered);
    setAddress((previous) =>
      previous.choice === CUSTOM
        ? previous.typed === ''
          ? initialAddress(offered)
          : previous
        : offered.includes(previous.choice)
          ? previous
          : initialAddress(offered),
    );
  }

  function handleFunctions(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFieldErrors({});
    setError(null);
    go('address', 'next');
  }

  function handleAddress(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!addressReady || slug === null) return;
    setFieldErrors({});
    setError(null);
    if (hasSongStep) go('song', 'next');
    else startMaking(slug);
  }

  function handleSong(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!songReady || slug === null) return;
    setFieldErrors({});
    setError(null);
    startMaking(slug);
  }

  function startMaking(chosen: string): void {
    setDone(0);
    setPreviewPath(null);
    go('making', 'next');
    void submit(chosen, song?.slot ?? null);
  }

  async function submit(chosen: string, chosenSong: SongSlot | null): Promise<void> {
    const gclid = ads.gclidForLead();
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bride,
          groom,
          weddingDate,
          countryIso: 'IN',
          phone,
          slug: chosen,
          functions,
          ...(chosenSong !== null && { songSlot: chosenSong }),
          ...(website !== '' && { website }),
          ...(gclid !== null && { gclid }),
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ErrorBody;
        const fields = (body.fields ?? {}) as FieldErrors;
        setFieldErrors(fields);
        setError(body.message ?? `The request failed with status ${response.status}.`);
        // Each problem goes back to the step that asked for it.
        if (fields.bride !== undefined || fields.groom !== undefined) go('names', 'back');
        else if (fields.slug !== undefined) {
          go('address', 'back');
          if (address.choice === CUSTOM) {
            setAddress((previous) => ({
              ...previous,
              check: { kind: 'problem', message: fields.slug ?? 'Choose another address.' },
            }));
          } else {
            // A ready-made address was taken meanwhile: offer fresh ones.
            void loadSuggestions(`${brideName}\n${groomName}`);
          }
        } else if (fields.functions !== undefined) go('functions', 'back');
        else if (fields.songSlot !== undefined) go('song', 'back');
        else if (Object.keys(fields).length > 0) go('details', 'back');
        else go(lastStep, 'back');
        return;
      }

      const body = (await response.json()) as { previewPath: string; whatsappSent?: boolean };
      setWhatsappSent(body.whatsappSent === true);
      setPreviewPath(body.previewPath);
      ads.reportConversion('signup');
      reportMetaConversion('signup');
      const leadId = body.previewPath.split('/').at(-1);
      if (leadId !== undefined) tracking.trackLead(leadId, place);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.name !== 'TimeoutError'
          ? caught.message
          : 'The request took too long. Check your connection and try again.',
      );
      go(lastStep, 'back');
    }
  }

  function backButton(label: string, to: Step): React.JSX.Element | null {
    if (topBack) return null;
    return (
      <Button
        variant="secondary"
        size="lg"
        className="w-14 shrink-0 px-0!"
        aria-label={label}
        onClick={() => {
          setError(null);
          go(to, 'back');
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
    );
  }

  /*
   * On the full screen of a short phone (the `short` variant), each step
   * drops its art and shows the count only in the bar, so the step fits
   * without a scroll. Screen readers still hear "Step 2 of 5".
   */
  const stepClass = cn('flex flex-col gap-4', screen && 'short:gap-3 flex-1');
  const artClass = screen ? 'short:hidden' : '';
  const countClass = cn('text-small text-ink-soft', screen && 'short:sr-only');

  /** On the full screen, the step's buttons stay at the bottom, above the home bar. */
  const actionsClass = screen
    ? 'bg-paper sticky bottom-0 z-10 mt-auto pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]'
    : undefined;

  /** The steps as a bar of segments, for the full screen. The words under the art still count them. */
  function stepBar(at: number): React.JSX.Element {
    return (
      <ol aria-hidden="true" className="mb-2 flex w-full max-w-xs gap-1.5">
        {Array.from({ length: totalSteps }, (_, index) => (
          <li
            key={index}
            className={cn(
              'rounded-pill h-2 flex-1 transition-colors duration-300',
              index < at ? 'bg-brand' : 'bg-sunken',
            )}
          />
        ))}
      </ol>
    );
  }

  /** The step before each one, for the back arrow at the top of the full screen. */
  const previous: Partial<Record<Step, { to: Step; label: string }>> = {
    details: { to: 'names', label: 'Back to your names' },
    functions: { to: 'details', label: 'Back to your big day' },
    address: { to: 'functions', label: 'Back to your functions' },
    song: { to: 'address', label: 'Back to your address' },
  };
  const back = previous[view];
  const topBackButton =
    topBack && back !== undefined
      ? createPortal(
          <button
            type="button"
            aria-label={back.label}
            onClick={() => {
              setError(null);
              go(back.to, 'back');
            }}
            className="border-paper/40 hover:bg-paper/10 text-paper grid size-11 shrink-0 place-items-center rounded-full border-2 transition-colors"
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
          </button>,
          backSlot,
        )
      : null;

  const errorAlert = error !== null && (
    <Alert tone="danger" title="Your website was not created.">
      {error}
    </Alert>
  );

  return (
    <div
      ref={root}
      onFocus={() => tracking.trackStep('started', place)}
      className={cn('flex w-full scroll-mt-24 flex-col', screen && 'flex-1', className)}
    >
      {topBackButton}
      {step === 'names' && (
        <form
          key="names"
          onSubmit={handleNames}
          className={cn(stepClass, STEP_MOTION[direction])}
          noValidate
        >
          <header className="flex flex-col items-center gap-2 text-center">
            {screen && stepBar(1)}
            <HeartsArt className={artClass} />
            <p className={countClass}>Step 1 of {totalSteps}</p>
            <h2 id={headingId} tabIndex={-1} className="text-heading scroll-mt-24 outline-none">
              The two of you
            </h2>
            <p className="text-small text-ink-soft">
              Two names, one story. Let us write it beautifully.
            </p>
          </header>
          <Input
            label="Bride's name"
            name="bride"
            autoComplete="off"
            value={bride}
            onChange={(event) => setBride(event.target.value)}
            onBlur={(event) => setBride(capitalizeName(event.target.value))}
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
            onBlur={(event) => setGroom(capitalizeName(event.target.value))}
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
          <div className={actionsClass}>
            <Button type="submit" size="lg" block disabled={!namesReady}>
              Begin our story
            </Button>
          </div>
        </form>
      )}

      {step === 'details' && (
        <form
          key="details"
          onSubmit={handleDetails}
          className={cn(stepClass, STEP_MOTION[direction])}
          noValidate
        >
          <header className="flex flex-col items-center gap-2 text-center">
            {screen && stepBar(2)}
            <CalendarArt isoDate={weddingDate === '' ? null : weddingDate} className={artClass} />
            <p className={countClass}>Step 2 of {totalSteps}</p>
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
            required
            value={weddingDate}
            onChange={(event) => {
              const value = event.target.value;
              // iOS Safari ignores `min` in its date wheel, so a past day can
              // still be picked there. Refuse it: the field keeps its last date.
              if (value !== '' && value < todayInIndia()) {
                setFieldErrors((errors) => ({ ...errors, weddingDate: PAST_DATE_ERROR }));
                return;
              }
              setWeddingDate(value);
              setFieldErrors(({ weddingDate: _, ...rest }) => rest);
            }}
            {...(fieldErrors.weddingDate !== undefined && { error: fieldErrors.weddingDate })}
          />
          {forever !== null && (
            <div
              key={forever}
              className="bg-brand-soft border-line rounded-input animate-rise-in flex flex-col items-center gap-1 border-2 p-4 text-center"
              aria-live="polite"
            >
              <p className="text-heading">
                {forever} <HeartGlyph className="align-middle" />
              </p>
              <p className="text-small text-ink-soft">{formatWeddingDate(weddingDate)}</p>
            </div>
          )}
          {/* India only, so the dial code is fixed. The field keeps 10 digits and
              drops the 0 or +91 that autofill often puts in front. */}
          <Input
            label="WhatsApp number"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            prefix="+91"
            value={phone}
            onChange={(event) => {
              setPhone(indianMobileDigits(event.target.value));
              setFieldErrors(({ phone: _, ...rest }) => rest);
            }}
            {...(fieldErrors.phone !== undefined && { error: fieldErrors.phone })}
          />
          {/* A note, not a tick: a required box stopped couples here. It
              still tells them, before they submit, what the number is for. */}
          <div className="flex items-start gap-3">
            <WhatsAppIcon className="text-ink-soft mt-0.5 size-5 shrink-0" />
            <p className="text-small text-ink-soft">
              <span className="text-ink block font-medium">Send my preview on WhatsApp</span>
              We will send your personal wedding link to this number. You also sign in with it
              later, so check that it is correct.
            </p>
          </div>

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

          <div className={cn('flex gap-3', actionsClass)}>
            {backButton('Back to your names', 'names')}
            <Button type="submit" size="lg" block disabled={!detailsReady}>
              Add our functions
            </Button>
          </div>
        </form>
      )}

      {step === 'functions' && (
        <form
          key="functions"
          onSubmit={handleFunctions}
          className={cn(stepClass, STEP_MOTION[direction])}
          noValidate
        >
          <header className="flex flex-col items-center gap-2 text-center">
            {screen && stepBar(3)}
            <FestivitiesArt className={artClass} />
            <p className={countClass}>Step 3 of {totalSteps}</p>
            <h2 id={headingId} tabIndex={-1} className="text-heading scroll-mt-24 outline-none">
              Your functions
            </h2>
            <p className="text-small text-ink-soft">
              Which functions are you having besides the wedding? Pick all that apply.
            </p>
          </header>
          <FunctionChoice
            label="Your functions"
            value={functions}
            onChange={(value) => {
              setFunctions(value);
              setFieldErrors(({ functions: _, ...rest }) => rest);
            }}
          />
          {fieldErrors.functions !== undefined && (
            <p className="text-small text-danger text-center" role="alert">
              {fieldErrors.functions}
            </p>
          )}
          <p className="bg-brand-soft rounded-input text-small p-3 text-center">
            No need to have every detail now. You can add the date, time and venue of each function
            later from your dashboard, and add or remove functions there too.
          </p>

          {errorAlert}

          <div className={cn('flex gap-3', actionsClass)}>
            {backButton('Back to your big day', 'details')}
            <Button type="submit" size="lg" block>
              {functions.length === 0 ? 'Skip, just the wedding' : 'Choose our address'}
            </Button>
          </div>
        </form>
      )}

      {step === 'address' && (
        <form
          key="address"
          onSubmit={handleAddress}
          className={cn(stepClass, STEP_MOTION[direction])}
          noValidate
        >
          <header className="flex flex-col items-center gap-2 text-center">
            {screen && stepBar(4)}
            <AddressArt className={artClass} />
            <p className={countClass}>Step 4 of {totalSteps}</p>
            <h2 id={headingId} tabIndex={-1} className="text-heading scroll-mt-24 outline-none">
              Your own address
            </h2>
            <p className="text-small text-ink-soft">
              Where your guests will find you. Pick one, or make it yours.
            </p>
          </header>
          {suggestions === null ? (
            <p
              className="text-ink-soft flex min-h-26 items-center justify-center gap-3"
              role="status"
            >
              <span className="border-sunken border-t-brand size-5 animate-spin rounded-full border-2" />
              Finding a free address for {brideName} & {groomName}
            </p>
          ) : (
            <AddressChoice
              key={suggestions.join(' ')}
              label="Your website address"
              suggestions={suggestions}
              domainLabel={domainLabel}
              checkSlug={checkAddress}
              value={address}
              onChange={setAddress}
            />
          )}
          <p className="bg-brand-soft rounded-input text-small p-3 text-center">
            Your site goes live at this address as soon as you pay. Until then, only you can see
            your preview.
          </p>

          {errorAlert}

          <div className={cn('flex gap-3', actionsClass)}>
            {backButton('Back to your functions', 'functions')}
            <Button type="submit" size="lg" block disabled={!addressReady}>
              {hasSongStep ? 'Choose our song' : 'Make my website'}
            </Button>
          </div>
        </form>
      )}

      {step === 'song' && (
        <form
          key="song"
          onSubmit={handleSong}
          className={cn(stepClass, STEP_MOTION[direction])}
          noValidate
        >
          <header className="flex flex-col items-center gap-2 text-center">
            {screen && stepBar(totalSteps)}
            <SongArt className={artClass} />
            <p className={countClass}>
              Step {totalSteps} of {totalSteps}
            </p>
            <h2 id={headingId} tabIndex={-1} className="text-heading scroll-mt-24 outline-none">
              Your song
            </h2>
            <p className="text-small text-ink-soft">
              The song your guests can play on your website. Tap play to listen.
            </p>
          </header>
          {songs === null ? (
            <p
              className="text-ink-soft flex min-h-26 items-center justify-center gap-3"
              role="status"
            >
              <span className="border-sunken border-t-brand size-5 animate-spin rounded-full border-2" />
              Finding your songs
            </p>
          ) : songs.length === 0 ? (
            <p className="text-ink-soft text-center">
              No songs right now. You can make your website without one.
            </p>
          ) : (
            <RadioGroup
              label="Choose your song"
              name="songSlot"
              value={songSlot === null ? '' : String(songSlot)}
              onChange={(value) => setSongSlot(parseSongSlot(value))}
              options={songs.map((option) => ({
                value: String(option.slot),
                label: option.name,
                // Playing a song chooses it, so the last one heard is the one picked.
                action: (
                  <PlayButton
                    src={option.src}
                    title={option.name}
                    onPlay={() => setSongSlot(option.slot)}
                  />
                ),
              }))}
              {...(fieldErrors.songSlot !== undefined && { error: fieldErrors.songSlot })}
            />
          )}
          {songs !== null && songs.length > 0 && (
            <p className="bg-brand-soft rounded-input text-small p-3 text-center">
              No pressure to get it perfect. You can change your song anytime from your dashboard.
            </p>
          )}

          {errorAlert}

          <div className={cn('flex gap-3', actionsClass)}>
            {backButton('Back to your address', 'address')}
            <Button type="submit" size="lg" block disabled={!songReady}>
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
          detail={whatsappSent ? SENT_DETAIL_WHATSAPP : SENT_DETAIL}
        />
      )}
    </div>
  );
}
