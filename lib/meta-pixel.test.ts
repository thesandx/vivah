import { describe, expect, it } from 'vitest';

import { metaTrackCall } from '@/lib/meta-pixel';

describe('metaTrackCall', () => {
  it('sends a preview made as a Lead with no data', () => {
    expect(metaTrackCall('signup')).toEqual(['Lead']);
    expect(metaTrackCall('signup', { value: 799, eventId: 'pay_1' })).toEqual(['Lead']);
  });

  it('sends a payment as a Purchase in rupees, with the payment id as the event id', () => {
    expect(metaTrackCall('purchase', { value: 639, eventId: 'pay_abc' })).toEqual([
      'Purchase',
      { value: 639, currency: 'INR' },
      { eventID: 'pay_abc' },
    ]);
  });

  it('sends a Purchase without an event id when there is none', () => {
    expect(metaTrackCall('purchase', { value: 799 })).toEqual([
      'Purchase',
      { value: 799, currency: 'INR' },
    ]);
  });

  it('sends nothing for a purchase without a usable amount', () => {
    expect(metaTrackCall('purchase')).toBeNull();
    expect(metaTrackCall('purchase', { value: Number.NaN })).toBeNull();
    expect(metaTrackCall('purchase', { value: -1 })).toBeNull();
  });
});
