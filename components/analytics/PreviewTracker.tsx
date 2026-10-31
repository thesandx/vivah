'use client';

import { useEffect, useMemo, useRef } from 'react';

import { PreviewTrackingContext, type PreviewTrackingState } from '@/hooks/usePreviewTracking';
import {
  isPreviewEventId,
  isPreviewSectionId,
  MAX_PREVIEW_SECTION_MS,
  PREVIEW_BEACON_PATH,
  PREVIEW_EVENT_ATTRIBUTE,
  PREVIEW_SECTION_ATTRIBUTE,
  type PreviewBeacon,
  type PreviewEventId,
  type PreviewSectionId,
  type PreviewViewer,
  URGENT_PREVIEW_EVENTS,
} from '@/lib/preview-tracking';
import { deviceFor } from '@/lib/visit-tracking';

/**
 * Measures how a couple uses their preview (ADR-0019): how long each invite
 * section holds the middle of the screen, and what they did, from opening
 * the invite to closing the payment window. It sends what it has as one
 * small beacon when the tab is hidden or the page is left, and at once on a
 * step of payment, because Razorpay's window or a redirect may follow.
 *
 * No cookie and nothing typed. The tab id is random and lives only in
 * memory, so a reload is a new view.
 *
 * Mark a section with `data-preview-section="<id>"` and a button or link
 * with `data-preview-event="<id>"`, using ids from `lib/preview-tracking.ts`.
 * A component records an event in code with `usePreviewTracking().track`.
 */
export interface PreviewTrackerProps {
  leadId: string;
  viewer: PreviewViewer;
  /** Recorded once when the page loads: `opened`, or `closed-seen`. */
  firstEvent: PreviewEventId;
  children: React.ReactNode;
}

interface Pending {
  sectionMs: Partial<Record<PreviewSectionId, number>>;
  events: PreviewEventId[];
}

/** An old browser without these is not measured. The page works the same. */
function supported(): boolean {
  return typeof IntersectionObserver !== 'undefined' && typeof crypto.randomUUID === 'function';
}

function send(beacon: PreviewBeacon): void {
  const body = JSON.stringify(beacon);
  // sendBeacon survives the page closing. A plain string goes as text/plain,
  // which needs no preflight.
  if (
    typeof navigator.sendBeacon === 'function' &&
    navigator.sendBeacon(PREVIEW_BEACON_PATH, body)
  ) {
    return;
  }
  void fetch(PREVIEW_BEACON_PATH, {
    method: 'POST',
    body,
    keepalive: true,
    signal: AbortSignal.timeout(5000),
  }).catch(() => undefined);
}

export function PreviewTracker({ leadId, viewer, firstEvent, children }: PreviewTrackerProps) {
  const pending = useRef<Pending>({ sectionMs: {}, events: [] });
  const flushRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!supported()) return undefined;
    const view = { id: crypto.randomUUID(), seq: 0 };
    let current: PreviewSectionId | null = null;
    let since = performance.now();
    // Kept here, not read from the document: when `visibilitychange` fires the
    // state is already "hidden", and the time before it must still count.
    let shown = document.visibilityState === 'visible';

    /** Adds the time since the last mark to the section in the middle of the screen. */
    function mark(): void {
      const now = performance.now();
      if (current !== null && shown) {
        const total = (pending.current.sectionMs[current] ?? 0) + Math.round(now - since);
        pending.current.sectionMs[current] = Math.min(total, MAX_PREVIEW_SECTION_MS);
      }
      since = now;
    }

    function flush(): void {
      mark();
      const { sectionMs, events } = pending.current;
      if (Object.keys(sectionMs).length === 0 && events.length === 0) return;
      send({
        leadId,
        viewId: view.id,
        seq: view.seq,
        device: deviceFor(window.innerWidth),
        viewer,
        sectionMs,
        events: events.slice(0, 50),
      });
      view.seq += 1;
      pending.current = { sectionMs: {}, events: [] };
    }
    flushRef.current = flush;
    pending.current.events.push(firstEvent);

    const middle = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).getAttribute(PREVIEW_SECTION_ATTRIBUTE);
          if (!isPreviewSectionId(id)) continue;
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
    for (const element of document.querySelectorAll(`[${PREVIEW_SECTION_ATTRIBUTE}]`)) {
      middle.observe(element);
    }

    function onClick(event: MouseEvent): void {
      const target = event.target instanceof Element ? event.target : null;
      const id =
        target?.closest(`[${PREVIEW_EVENT_ATTRIBUTE}]`)?.getAttribute(PREVIEW_EVENT_ATTRIBUTE) ??
        null;
      if (!isPreviewEventId(id)) return;
      pending.current.events.push(id);
      if (URGENT_PREVIEW_EVENTS.has(id)) flush();
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
      flush();
      flushRef.current = () => undefined;
    };
  }, [leadId, viewer, firstEvent]);

  const state = useMemo<PreviewTrackingState>(
    () => ({
      track: (event) => {
        pending.current.events.push(event);
        if (URGENT_PREVIEW_EVENTS.has(event)) flushRef.current();
      },
    }),
    [],
  );

  return <PreviewTrackingContext value={state}>{children}</PreviewTrackingContext>;
}
