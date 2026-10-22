'use client';

import Script from 'next/script';
import { useCallback, useEffect, useMemo } from 'react';

import {
  type ConversionDetails,
  GoogleAdsContext,
  type GoogleAdsState,
} from '@/hooks/useGoogleAds';
import {
  CONVERSION_SENT_PREFIX,
  type ConversionKind,
  conversionTarget,
  GCLID_STORAGE_KEY,
  gtagScriptUrl,
  parseGclid,
} from '@/lib/google-ads';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export interface GoogleAdsProviderProps {
  /** `AW-123456789`. Empty turns measurement off: no tag at all. */
  adsId: string;
  signupLabel: string;
  purchaseLabel: string;
  children: React.ReactNode;
}

/**
 * Google's queue. gtag.js reads each entry as an `arguments` object, not an
 * array, so this has to push `arguments` exactly as Google's snippet does.
 */
function gtag(..._args: unknown[]): void {
  window.dataLayer = window.dataLayer ?? [];
  // eslint-disable-next-line prefer-rest-params -- gtag.js reads the Arguments object, not an array
  window.dataLayer.push(arguments);
}

/**
 * `sessionStorage` can throw (Safari private mode, storage turned off). A
 * failed read is "nothing stored" and a failed write is a no-op.
 */
function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage is off. The click id and the once-per-payment guard are lost
    // with it; Google still drops a repeated transaction id.
  }
}

/** Set once per page load: Google's consent and config calls must not repeat. */
let configured = false;

/**
 * Google Ads measurement for the product site and the preview page (ADR-0013).
 *
 * The tag loads on every visit, with no cookie banner (Sandeep, 2026-10-22).
 * It counts conversions only: remarketing (ad personalisation) and analytics
 * stay off.
 *
 * It also keeps the `gclid` of an ad click for the tab, so the sign-up card
 * can store it on the lead. A couple who pays in another browser (the
 * WhatsApp link) can then still be matched to the ad by an upload.
 */
export function GoogleAdsProvider({
  adsId,
  signupLabel,
  purchaseLabel,
  children,
}: GoogleAdsProviderProps) {
  useEffect(() => {
    const gclid = parseGclid(new URLSearchParams(window.location.search).get('gclid'));
    if (gclid !== null) write(GCLID_STORAGE_KEY, gclid);
  }, []);

  useEffect(() => {
    if (configured) return;
    configured = true;
    gtag('consent', 'default', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      // No remarketing lists and no analytics: only conversion counting.
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    gtag('js', new Date());
    gtag('config', adsId);
  }, [adsId]);

  const gclidForLead = useCallback(() => parseGclid(read(GCLID_STORAGE_KEY)), []);

  const reportConversion = useCallback(
    (kind: ConversionKind, details: ConversionDetails = {}) => {
      const target = conversionTarget(adsId, kind === 'signup' ? signupLabel : purchaseLabel);
      if (target === null) return;
      const { value, transactionId } = details;
      if (transactionId !== undefined) {
        const key = `${CONVERSION_SENT_PREFIX}${transactionId}`;
        if (read(key) !== null) return;
        write(key, '1');
      }
      gtag('event', 'conversion', {
        send_to: target,
        ...(value !== undefined && { value, currency: 'INR' }),
        ...(transactionId !== undefined && { transaction_id: transactionId }),
      });
    },
    [adsId, signupLabel, purchaseLabel],
  );

  const state = useMemo<GoogleAdsState>(
    () => ({ gclidForLead, reportConversion }),
    [gclidForLead, reportConversion],
  );

  return (
    <GoogleAdsContext.Provider value={state}>
      {children}
      <Script src={gtagScriptUrl(adsId)} strategy="afterInteractive" />
    </GoogleAdsContext.Provider>
  );
}

/**
 * The provider when an id is set, else the children alone. Server Components
 * render this, so a build without Google Ads ships no tag.
 */
export function GoogleAds(props: GoogleAdsProviderProps) {
  return props.adsId === '' ? props.children : <GoogleAdsProvider {...props} />;
}
