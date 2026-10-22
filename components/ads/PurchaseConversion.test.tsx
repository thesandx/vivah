import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PurchaseConversion } from '@/components/ads/PurchaseConversion';
import { GoogleAdsContext, type GoogleAdsState } from '@/hooks/useGoogleAds';

describe('PurchaseConversion', () => {
  it('reports the purchase with its amount and payment id', () => {
    const reportConversion = vi.fn();
    const state: GoogleAdsState = {
      consent: 'granted',
      accept: vi.fn(),
      decline: vi.fn(),
      gclidForLead: () => null,
      reportConversion,
    };
    const { container } = render(
      <GoogleAdsContext.Provider value={state}>
        <PurchaseConversion valueRupees={499} paymentId="pay_1" />
      </GoogleAdsContext.Provider>,
    );
    expect(reportConversion).toHaveBeenCalledWith('purchase', {
      value: 499,
      transactionId: 'pay_1',
    });
    expect(container).toBeEmptyDOMElement();
  });
});
