'use client';

import { useEffect, useMemo, useRef } from 'react';

import { PreviewTrackingContext, type PreviewTrackingState } from '@/hooks/usePreviewTracking';
import {
  INVITE_BEACON_PATH,
  INVITE_EVENT_ATTRIBUTE,
  INVITE_SEEN_KEY_PREFIX,
  type InviteBeacon,
  type InviteEventId,
  type InviteSeen,
  isInviteSeen,
  nextSeen,
} from '@/lib/invite-tracking';
import { deviceFor } from '@/lib/visit-tracking';

/**
 * Counts the visits to a couple's live invite (ADR-0020): one beacon when
 * the page loads, one when the guest taps to open the invite, and one on
 * each RSVP tap.
 *
 * No cookie. The browser keeps one fixed word per invite in `localStorage`,
 * so a second visit is not counted as a new visitor, and the couple's and the
 * admin's browsers are told apart. A link from `/admin` or the dashboard adds
 * a mark to the address (`lib/invite-tracking.ts`), which this removes at
 * once. The admin's browser sends nothing.
 *
 * The invite's gate already reports "opened" through `usePreviewTracking`
 * (the preview page uses it). This tracker answers that same call on the live
 * invite.
 */
export interface InviteVisitTrackerProps {
  weddingId: string;
  /** The guest link's id when the guest came through one. */
  guestLinkId: string | null;
  children: React.ReactNode;
}

function send(beacon: InviteBeacon): void {
  const body = JSON.stringify(beacon);
  // sendBeacon survives the page closing (an RSVP tap opens WhatsApp). A
  // plain string goes as text/plain, which needs no preflight.
  if (
    typeof navigator.sendBeacon === 'function' &&
    navigator.sendBeacon(INVITE_BEACON_PATH, body)
  ) {
    return;
  }
  void fetch(INVITE_BEACON_PATH, {
    method: 'POST',
    body,
    keepalive: true,
    signal: AbortSignal.timeout(5000),
  }).catch(() => undefined);
}

/** The browser's note, or `null` when storage is blocked or empty. */
function readSeen(key: string): InviteSeen | null {
  try {
    const value = window.localStorage.getItem(key);
    return isInviteSeen(value) ? value : null;
  } catch {
    return null;
  }
}

function writeSeen(key: string, value: InviteSeen): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // A private window can refuse storage. Then each visit counts as new.
  }
}

export function InviteVisitTracker({ weddingId, guestLinkId, children }: InviteVisitTrackerProps) {
  const emitRef = useRef<(event: InviteEventId) => void>(() => undefined);

  useEffect(() => {
    if (typeof crypto.randomUUID !== 'function') return undefined;
    const key = `${INVITE_SEEN_KEY_PREFIX}${weddingId}`;
    const before = readSeen(key);
    const mark = window.location.hash.slice(1);
    const seen = nextSeen(before, mark);
    writeSeen(key, seen);
    if (mark !== '') {
      // The mark is for this browser only. A copied address must not carry it.
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      );
    }
    if (seen === 'admin') return undefined;

    const viewId = crypto.randomUUID();
    let envelopeSent = false;
    function emit(event: InviteEventId): void {
      if (event === 'envelope-opened') {
        if (envelopeSent) return;
        envelopeSent = true;
      }
      send({
        weddingId,
        viewId,
        event,
        device: deviceFor(window.innerWidth),
        viewer: seen === 'couple' ? 'couple' : 'guest',
        firstVisit: before === null,
        ...(guestLinkId !== null && { guestLinkId }),
      });
    }
    emitRef.current = emit;
    emit('opened');

    function onClick(event: MouseEvent): void {
      const target = event.target instanceof Element ? event.target : null;
      const id = target
        ?.closest(`[${INVITE_EVENT_ATTRIBUTE}]`)
        ?.getAttribute(INVITE_EVENT_ATTRIBUTE);
      if (id === 'rsvp-tapped') emit('rsvp-tapped');
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      emitRef.current = () => undefined;
    };
  }, [weddingId, guestLinkId]);

  const state = useMemo<PreviewTrackingState>(
    () => ({
      track: (event) => {
        if (event === 'gate-opened') emitRef.current('envelope-opened');
      },
    }),
    [],
  );

  return <PreviewTrackingContext value={state}>{children}</PreviewTrackingContext>;
}
