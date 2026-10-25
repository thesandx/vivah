import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MetaPixel, reportMetaConversion } from '@/components/ads/MetaPixel';
import { PurchaseConversion } from '@/components/ads/PurchaseConversion';

// The real loader injects a <script> tag; the queue is what matters here.
vi.mock('next/script', () => ({ default: () => null }));

/** Every queued `fbq` call, as plain arrays. */
function queued(): unknown[][] {
  return (window.fbq?.queue ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
}

// One page load: the Pixel initialises once, so these tests run in order.
describe('MetaPixel', () => {
  it('ships nothing without a Pixel id', () => {
    const { container } = render(<MetaPixel pixelId="" />);
    expect(container).toBeEmptyDOMElement();
    reportMetaConversion('signup');
    expect(window.fbq).toBeUndefined();
  });

  it('turns off automatic collection, sends no PageView, and reports a Lead', () => {
    render(<MetaPixel pixelId="1234567890123456" />);
    reportMetaConversion('signup');
    expect(queued()).toEqual([
      ['set', 'autoConfig', false, '1234567890123456'],
      ['init', '1234567890123456'],
      ['track', 'Lead'],
    ]);
  });

  it('reports a purchase once per payment, with the amount and the payment id', () => {
    const before = queued().length;
    const { rerender } = render(<PurchaseConversion valueRupees={639} paymentId="pay_m1" />);
    rerender(<PurchaseConversion valueRupees={639} paymentId="pay_m1" />);
    render(<PurchaseConversion valueRupees={639} paymentId="pay_m1" />);
    expect(queued().slice(before)).toEqual([
      ['track', 'Purchase', { value: 639, currency: 'INR' }, { eventID: 'pay_m1' }],
    ]);
  });
});
