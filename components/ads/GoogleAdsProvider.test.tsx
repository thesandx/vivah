import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GoogleAds, GoogleAdsProvider } from '@/components/ads/GoogleAdsProvider';
import { useGoogleAds } from '@/hooks/useGoogleAds';
import { CONSENT_STORAGE_KEY, GCLID_STORAGE_KEY } from '@/lib/google-ads';

// next/script needs the Next runtime. Stand in a marker for the loaded script.
vi.mock('next/script', () => ({
  default: ({ src }: { src: string }) => <span data-testid="gtag-script" data-src={src} />,
}));

const PROPS = { adsId: 'AW-123456789', signupLabel: 'SignUpLbl', purchaseLabel: 'BuyLabel1' };

/** Exposes the hook to the test through buttons. */
function Probe() {
  const ads = useGoogleAds();
  return (
    <>
      <output data-testid="gclid">{ads.gclidForLead() ?? 'none'}</output>
      <button type="button" onClick={() => ads.reportConversion('signup')}>
        signup
      </button>
      <button
        type="button"
        onClick={() => ads.reportConversion('purchase', { value: 499, transactionId: 'pay_1' })}
      >
        purchase
      </button>
    </>
  );
}

/** The `send_to` of every conversion event in Google's queue. */
function conversions(): unknown[] {
  return (window.dataLayer ?? [])
    .map((entry) => Array.from(entry as ArrayLike<unknown>))
    .filter((args) => args[0] === 'event' && args[1] === 'conversion')
    .map((args) => args[2]);
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.dataLayer = [];
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('GoogleAdsProvider', () => {
  it('asks first, and loads nothing before an answer', () => {
    render(<GoogleAdsProvider {...PROPS}>page</GoogleAdsProvider>);
    expect(screen.getByRole('region', { name: 'Cookie choice' })).toBeInTheDocument();
    expect(screen.queryByTestId('gtag-script')).toBeNull();
  });

  it('loads the tag after Accept, and remembers the answer', () => {
    render(<GoogleAdsProvider {...PROPS}>page</GoogleAdsProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted');
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).toBeNull();
    expect(screen.getByTestId('gtag-script')).toHaveAttribute(
      'data-src',
      'https://www.googletagmanager.com/gtag/js?id=AW-123456789',
    );
  });

  it('loads nothing after No thanks, and sends no conversion', () => {
    render(
      <GoogleAdsProvider {...PROPS}>
        <Probe />
      </GoogleAdsProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }));
    fireEvent.click(screen.getByRole('button', { name: 'signup' }));
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied');
    expect(screen.queryByTestId('gtag-script')).toBeNull();
    expect(conversions()).toEqual([]);
  });

  it('sends each conversion with its label, and a purchase once per payment', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    render(
      <GoogleAdsProvider {...PROPS}>
        <Probe />
      </GoogleAdsProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'signup' }));
    fireEvent.click(screen.getByRole('button', { name: 'purchase' }));
    fireEvent.click(screen.getByRole('button', { name: 'purchase' }));
    expect(conversions()).toEqual([
      { send_to: 'AW-123456789/SignUpLbl' },
      {
        send_to: 'AW-123456789/BuyLabel1',
        value: 499,
        currency: 'INR',
        transaction_id: 'pay_1',
      },
    ]);
  });

  it('skips a conversion whose label is not set', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    render(
      <GoogleAdsProvider {...PROPS} signupLabel="">
        <Probe />
      </GoogleAdsProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'signup' }));
    expect(conversions()).toEqual([]);
  });

  it('keeps the click id from the address, and gives it out only with consent', () => {
    window.history.replaceState(null, '', '/?gclid=Cj0KCQjw_abc-123XYZ');
    render(
      <GoogleAdsProvider {...PROPS}>
        <Probe />
      </GoogleAdsProvider>,
    );
    expect(window.sessionStorage.getItem(GCLID_STORAGE_KEY)).toBe('Cj0KCQjw_abc-123XYZ');
    expect(screen.getByTestId('gclid')).toHaveTextContent('none');
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(screen.getByTestId('gclid')).toHaveTextContent('Cj0KCQjw_abc-123XYZ');
  });

  it('shows no banner where it is told not to ask', () => {
    render(
      <GoogleAdsProvider {...PROPS} askConsent={false}>
        page
      </GoogleAdsProvider>,
    );
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).toBeNull();
  });

  it('follows an answer given in another tab', () => {
    render(<GoogleAdsProvider {...PROPS}>page</GoogleAdsProvider>);
    act(() => {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
      window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_STORAGE_KEY }));
    });
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).toBeNull();
  });
});

describe('GoogleAds', () => {
  it('renders the page alone when no id is set', () => {
    render(
      <GoogleAds {...PROPS} adsId="">
        page
      </GoogleAds>,
    );
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).toBeNull();
  });
});

describe('useGoogleAds', () => {
  it('does nothing outside the provider', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'signup' }));
    expect(screen.getByTestId('gclid')).toHaveTextContent('none');
    expect(conversions()).toEqual([]);
  });
});
