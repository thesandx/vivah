import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GoogleAds, GoogleAdsProvider } from '@/components/ads/GoogleAdsProvider';
import { useGoogleAds } from '@/hooks/useGoogleAds';
import { GCLID_STORAGE_KEY } from '@/lib/google-ads';

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

/** The parameters of every conversion event in Google's queue. */
function conversions(): unknown[] {
  return (window.dataLayer ?? [])
    .map((entry) => Array.from(entry as ArrayLike<unknown>))
    .filter((args) => args[0] === 'event' && args[1] === 'conversion')
    .map((args) => args[2]);
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.dataLayer = [];
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('GoogleAdsProvider', () => {
  it('loads the tag for this account at once, with no banner', () => {
    render(<GoogleAdsProvider {...PROPS}>page</GoogleAdsProvider>);
    expect(screen.getByTestId('gtag-script')).toHaveAttribute(
      'data-src',
      'https://www.googletagmanager.com/gtag/js?id=AW-123456789',
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sends each conversion with its label, and a purchase once per payment', () => {
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
    render(
      <GoogleAdsProvider {...PROPS} signupLabel="">
        <Probe />
      </GoogleAdsProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'signup' }));
    expect(conversions()).toEqual([]);
  });

  it('keeps the click id from the address for the lead', () => {
    window.history.replaceState(null, '', '/?gclid=Cj0KCQjw_abc-123XYZ');
    const page = () => (
      <GoogleAdsProvider {...PROPS}>
        <Probe />
      </GoogleAdsProvider>
    );
    const { rerender } = render(page());
    expect(window.sessionStorage.getItem(GCLID_STORAGE_KEY)).toBe('Cj0KCQjw_abc-123XYZ');
    // The form reads the click id when it submits, after the first render.
    rerender(page());
    expect(screen.getByTestId('gclid')).toHaveTextContent('Cj0KCQjw_abc-123XYZ');
  });

  it('ignores a click id that is not one', () => {
    window.history.replaceState(null, '', '/?gclid=%3Cb%3E');
    render(
      <GoogleAdsProvider {...PROPS}>
        <Probe />
      </GoogleAdsProvider>,
    );
    expect(screen.getByTestId('gclid')).toHaveTextContent('none');
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
    expect(screen.queryByTestId('gtag-script')).toBeNull();
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
