'use client';

import Script from 'next/script';
import { useEffect } from 'react';

import type { ConversionKind } from '@/lib/google-ads';
import {
  META_EVENT_SENT_PREFIX,
  META_PIXEL_SCRIPT_URL,
  type MetaEventDetails,
  metaTrackCall,
} from '@/lib/meta-pixel';

/** Meta's queue function, as its snippet defines it. */
interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
}

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export interface MetaPixelProps {
  /** The Pixel (dataset) id. Empty turns measurement off: no Pixel at all. */
  pixelId: string;
}

/**
 * Meta's queue, until `fbevents.js` loads and takes it over. The library
 * reads each entry as an `arguments` object, so this pushes `arguments`
 * exactly as Meta's snippet does.
 */
function installQueue(): Fbq {
  if (window.fbq !== undefined) return window.fbq;
  const fbq = function (this: unknown) {
    if (fbq.callMethod !== undefined) {
      // eslint-disable-next-line prefer-rest-params, prefer-spread -- forwards Meta's Arguments object unchanged, as its snippet does
      fbq.callMethod.apply(fbq, arguments as unknown as unknown[]);
    } else {
      // eslint-disable-next-line prefer-rest-params -- fbevents.js reads the Arguments object, not an array
      fbq.queue.push(arguments);
    }
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  return fbq;
}

/**
 * `sessionStorage` can throw (Safari private mode, storage turned off). A
 * failed read is "nothing sent" and a failed write is a no-op.
 */
function alreadySent(key: string): boolean {
  try {
    if (window.sessionStorage.getItem(key) !== null) return true;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // Storage is off. A refresh of the success screen may then count twice.
  }
  return false;
}

/** Set once per page load: Meta's set and init calls must not repeat. */
let initialised = false;

/**
 * Reports a conversion to Meta, when the Pixel is on this page. A no-op
 * otherwise, so a build without a Pixel id sends nothing.
 */
export function reportMetaConversion(kind: ConversionKind, details: MetaEventDetails = {}): void {
  if (!initialised || window.fbq === undefined) return;
  const call = metaTrackCall(kind, details);
  if (call === null) return;
  if (details.eventId !== undefined && alreadySent(`${META_EVENT_SENT_PREFIX}${details.eventId}`))
    return;
  window.fbq('track', ...call);
}

/**
 * The Meta Pixel for the product site and the preview page (ADR-0017).
 *
 * It sends two events only: `Lead` when the sign-up card makes a preview and
 * `Purchase` on the payment-success screen. There is no `PageView`, and
 * Meta's automatic collection of buttons and page data is off
 * (`autoConfig`). Meta never gets a name, a number or an email.
 */
function MetaPixelLoader({ pixelId }: MetaPixelProps) {
  useEffect(() => {
    if (initialised) return;
    initialised = true;
    const fbq = installQueue();
    // Must come before `init`, or Meta collects button clicks and page metadata.
    fbq('set', 'autoConfig', false, pixelId);
    fbq('init', pixelId);
  }, [pixelId]);

  return <Script src={META_PIXEL_SCRIPT_URL} strategy="afterInteractive" />;
}

/**
 * The Pixel when an id is set, else nothing. Server Components render this,
 * so a build without a Pixel id ships no Meta script.
 */
export function MetaPixel({ pixelId }: MetaPixelProps) {
  return pixelId === '' ? null : <MetaPixelLoader pixelId={pixelId} />;
}
