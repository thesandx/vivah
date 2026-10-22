'use client';

import Script from 'next/script';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { ConsentBanner } from '@/components/ads/ConsentBanner';
import {
  type ConversionDetails,
  GoogleAdsContext,
  type GoogleAdsState,
} from '@/hooks/useGoogleAds';
import {
  type AdConsent,
  CONSENT_STORAGE_KEY,
  CONVERSION_SENT_PREFIX,
  type ConversionKind,
  conversionTarget,
  GCLID_STORAGE_KEY,
  gtagScriptUrl,
  parseConsent,
  parseGclid,
} from '@/lib/google-ads';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export interface GoogleAdsProviderProps {
  /** `AW-123456789`. Empty turns measurement off: no tag, no banner. */
  adsId: string;
  signupLabel: string;
  purchaseLabel: string;
  /**
   * Show the consent banner. The preview page passes `false`: a banner over
   * the pay button costs sales, so a purchase there counts only when the
   * visitor accepted earlier, on the product site.
   */
  askConsent?: boolean;
  children: React.ReactNode;
}

/** Fired in this tab when the banner is answered; `storage` covers other tabs. */
const CONSENT_EVENT = 'vivah:ad-consent';

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
 * Storage can throw (Safari private mode, storage turned off). A failed read
 * is "no answer" and a failed write is a no-op, never a broken page.
 */
function read(storage: 'local' | 'session', key: string): string | null {
  try {
    return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(storage: 'local' | 'session', key: string, value: string): void {
  try {
    (storage === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // Storage is off. The answer lasts until the page closes, which is fine.
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CONSENT_EVENT, onChange);
  };
}

const readConsent = (): AdConsent | null => parseConsent(read('local', CONSENT_STORAGE_KEY));

/** The server cannot know the answer; `undefined` keeps the banner out of the HTML. */
const serverConsent = (): undefined => undefined;

/** Set once per page load: Google's consent and config calls must not repeat. */
let configured = false;

/**
 * Google Ads measurement for the product site and the preview page (ADR-0013).
 *
 * Basic consent mode: Google's script is not even requested until the visitor
 * presses "Accept". Before that no cookie is set and nothing reaches Google.
 * The answer is kept in `localStorage`, so the banner asks once per browser.
 *
 * It also keeps the `gclid` of an ad click for the tab, so the sign-up card
 * can store it on the lead. A couple who pays in another browser (the
 * WhatsApp link) can then still be matched to the ad by an upload.
 */
export function GoogleAdsProvider({
  adsId,
  signupLabel,
  purchaseLabel,
  askConsent = true,
  children,
}: GoogleAdsProviderProps) {
  const consent = useSyncExternalStore(subscribe, readConsent, serverConsent);

  useEffect(() => {
    const gclid = parseGclid(new URLSearchParams(window.location.search).get('gclid'));
    if (gclid !== null) write('session', GCLID_STORAGE_KEY, gclid);
  }, []);

  useEffect(() => {
    if (consent !== 'granted' || configured) return;
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
  }, [consent, adsId]);

  const answer = useCallback((value: AdConsent) => {
    write('local', CONSENT_STORAGE_KEY, value);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }, []);

  const gclidForLead = useCallback(
    () => (consent === 'granted' ? parseGclid(read('session', GCLID_STORAGE_KEY)) : null),
    [consent],
  );

  const reportConversion = useCallback(
    (kind: ConversionKind, details: ConversionDetails = {}) => {
      if (consent !== 'granted') return;
      const target = conversionTarget(adsId, kind === 'signup' ? signupLabel : purchaseLabel);
      if (target === null) return;
      const { value, transactionId } = details;
      if (transactionId !== undefined) {
        const key = `${CONVERSION_SENT_PREFIX}${transactionId}`;
        if (read('session', key) !== null) return;
        write('session', key, '1');
      }
      gtag('event', 'conversion', {
        send_to: target,
        ...(value !== undefined && { value, currency: 'INR' }),
        ...(transactionId !== undefined && { transaction_id: transactionId }),
      });
    },
    [consent, adsId, signupLabel, purchaseLabel],
  );

  const state = useMemo<GoogleAdsState>(
    () => ({
      consent,
      accept: () => answer('granted'),
      decline: () => answer('denied'),
      gclidForLead,
      reportConversion,
    }),
    [consent, answer, gclidForLead, reportConversion],
  );

  return (
    <GoogleAdsContext.Provider value={state}>
      {children}
      {consent === 'granted' && <Script src={gtagScriptUrl(adsId)} strategy="afterInteractive" />}
      {askConsent && consent === null && (
        <ConsentBanner onAccept={() => answer('granted')} onDecline={() => answer('denied')} />
      )}
    </GoogleAdsContext.Provider>
  );
}

/**
 * The provider when an id is set, else the children alone. Server Components
 * render this, so a build without Google Ads ships no banner.
 */
export function GoogleAds(props: GoogleAdsProviderProps) {
  return props.adsId === '' ? props.children : <GoogleAdsProvider {...props} />;
}
