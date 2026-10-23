'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  type SignupPlace,
  VisitTrackingContext,
  type VisitTrackingState,
} from '@/hooks/useVisitTracking';
import {
  campaignFrom,
  classifySource,
  CTA_ATTRIBUTE,
  type CtaId,
  deviceFor,
  HOME_CTAS,
  HOME_SECTIONS,
  isSignupCta,
  MAX_SECTION_MS,
  SECTION_ATTRIBUTE,
  type SectionId,
  type SignupStepId,
  VISIT_BEACON_PATH,
  VISIT_ID_STORAGE_KEY,
  type VisitBeacon,
} from '@/lib/visit-tracking';

/**
 * Measures a home page visit (ADR-0014): which marked buttons the visitor
 * taps, how long each section holds the middle of the screen, and how far
 * through the sign-up card they get. It sends what it has as one small
 * beacon when the tab is hidden or the page is left, and at once when the
 * card makes a preview.
 *
 * No cookie, no third party and nothing typed into the card. The visit id is
 * random and lives in `sessionStorage`, so it dies with the tab.
 *
 * Nothing runs on scroll. An IntersectionObserver whose root is a line across
 * the middle of the screen says which section is there, so exactly one
 * section collects time at once. A section streamed in later (the reviews)
 * is picked up by a MutationObserver.
 *
 * Mark a section with `data-track-section="<id>"` and a button or link with
 * `data-track-cta="<id>"`, using ids from `lib/visit-tracking.ts`.
 */
export interface VisitTrackerProps {
  children: React.ReactNode;
}

interface Pending {
  sectionMs: Partial<Record<SectionId, number>>;
  clicks: CtaId[];
  steps: SignupStepId[];
  lead?: { id: string; cta: CtaId };
}

const SECTION_IDS = new Set<string>(HOME_SECTIONS.map((section) => section.id));
const CTA_IDS = new Set<string>(HOME_CTAS.map((cta) => cta.id));

function isSectionId(value: string | undefined): value is SectionId {
  return value !== undefined && SECTION_IDS.has(value);
}

function isCtaId(value: string | null): value is CtaId {
  return value !== null && CTA_IDS.has(value);
}

/** This tab's visit id and the next beacon number. Storage can throw; then both live in memory. */
function loadVisit(): { id: string; seq: number } {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(VISIT_ID_STORAGE_KEY) ?? 'null') as {
      id?: unknown;
      seq?: unknown;
    } | null;
    if (typeof stored?.id === 'string' && typeof stored.seq === 'number') {
      return { id: stored.id, seq: stored.seq };
    }
  } catch {
    // Unreadable or blocked: start a new visit.
  }
  return { id: crypto.randomUUID(), seq: 0 };
}

/** An old browser without these is not measured. The page works the same. */
function supported(): boolean {
  return (
    typeof IntersectionObserver !== 'undefined' &&
    typeof MutationObserver !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  );
}

function saveVisit(visit: { id: string; seq: number }): void {
  try {
    window.sessionStorage.setItem(VISIT_ID_STORAGE_KEY, JSON.stringify(visit));
  } catch {
    // Storage is off. The next page load starts a new visit.
  }
}

function send(beacon: VisitBeacon): void {
  const body = JSON.stringify(beacon);
  // sendBeacon survives the page closing. A plain string goes as text/plain,
  // which needs no preflight.
  if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(VISIT_BEACON_PATH, body)) {
    return;
  }
  void fetch(VISIT_BEACON_PATH, {
    method: 'POST',
    body,
    keepalive: true,
    signal: AbortSignal.timeout(5000),
  }).catch(() => undefined);
}

export function VisitTracker({ children }: VisitTrackerProps) {
  const pending = useRef<Pending>({ sectionMs: {}, clicks: [], steps: [] });
  const stepsSent = useRef(new Set<SignupStepId>());
  const lastSignupCta = useRef<CtaId | null>(null);
  const flushRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!supported()) return undefined;
    const visit = loadVisit();
    const landing = { search: window.location.search, referrer: document.referrer };
    let current: SectionId | null = null;
    let since = performance.now();
    // Kept here, not read from the document: when `visibilitychange` fires the
    // state is already "hidden", and the time before it must still count.
    let shown = document.visibilityState === 'visible';

    /** Adds the time since the last mark to the section in the middle of the screen. */
    function mark(): void {
      const now = performance.now();
      if (current !== null && shown) {
        const total = (pending.current.sectionMs[current] ?? 0) + Math.round(now - since);
        pending.current.sectionMs[current] = Math.min(total, MAX_SECTION_MS);
      }
      since = now;
    }

    function flush(): void {
      mark();
      const { sectionMs, clicks, steps, lead } = pending.current;
      if (Object.keys(sectionMs).length === 0 && clicks.length === 0 && steps.length === 0) {
        return;
      }
      const first = visit.seq === 0;
      const campaign = first ? campaignFrom(landing.search) : undefined;
      send({
        visitId: visit.id,
        seq: visit.seq,
        device: deviceFor(window.innerWidth),
        ...(first && {
          source: classifySource(landing.search, landing.referrer, window.location.hostname),
        }),
        ...(campaign !== undefined && { campaign }),
        sectionMs,
        clicks: clicks.slice(0, 50),
        steps,
        ...(lead !== undefined && { lead }),
      });
      visit.seq += 1;
      saveVisit(visit);
      pending.current = { sectionMs: {}, clicks: [], steps: [] };
    }
    flushRef.current = flush;

    const middle = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.trackSection;
          if (!isSectionId(id)) continue;
          if (entry.isIntersecting) {
            mark();
            current = id;
          } else if (current === id) {
            mark();
            current = null;
          }
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    const observed = new WeakSet<Element>();
    function observeSections(): void {
      for (const element of document.querySelectorAll(`[${SECTION_ATTRIBUTE}]`)) {
        if (observed.has(element)) continue;
        observed.add(element);
        middle.observe(element);
      }
    }
    observeSections();
    let rescan: number | undefined;
    const streamed = new MutationObserver(() => {
      window.clearTimeout(rescan);
      rescan = window.setTimeout(observeSections, 500);
    });
    streamed.observe(document.body, { childList: true, subtree: true });

    function onClick(event: MouseEvent): void {
      const target = event.target instanceof Element ? event.target : null;
      const id = target?.closest(`[${CTA_ATTRIBUTE}]`)?.getAttribute(CTA_ATTRIBUTE) ?? null;
      if (!isCtaId(id)) return;
      pending.current.clicks.push(id);
      if (isSignupCta(id)) lastSignupCta.current = id;
    }

    function onVisibility(): void {
      if (document.visibilityState === 'hidden') {
        flush();
        shown = false;
      } else {
        shown = true;
        since = performance.now();
      }
    }

    document.addEventListener('click', onClick, { capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      middle.disconnect();
      streamed.disconnect();
      window.clearTimeout(rescan);
      // A move to another page of the site ends this page's part of the visit.
      flush();
      flushRef.current = () => undefined;
    };
  }, []);

  const state = useMemo<VisitTrackingState>(() => {
    const creditFor = (place: SignupPlace): CtaId =>
      place === 'hero' ? 'hero-card' : (lastSignupCta.current ?? 'hero-card');
    return {
      trackStep: (step, place) => {
        if (stepsSent.current.has(step)) return;
        stepsSent.current.add(step);
        pending.current.steps.push(step);
        // A start in the hero card is a tap on it: there is no button to count.
        if (step === 'started' && place === 'hero') {
          pending.current.clicks.push('hero-card');
          lastSignupCta.current = 'hero-card';
        }
      },
      trackLead: (leadId, place) => {
        pending.current.lead = { id: leadId, cta: creditFor(place) };
        if (!stepsSent.current.has('made')) {
          stepsSent.current.add('made');
          pending.current.steps.push('made');
        }
        flushRef.current();
      },
    };
  }, []);

  return <VisitTrackingContext value={state}>{children}</VisitTrackingContext>;
}
