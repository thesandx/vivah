import { describe, expect, it } from 'vitest';

import { CHAT_SHOTS, isPublishedChat, isPublishedReview, REVIEWS } from '@/lib/testimonials';

describe('testimonials', () => {
  it('has unique ids, so the carousels have stable keys', () => {
    const ids = [...REVIEWS, ...CHAT_SHOTS].map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every star rating a value from 1 to 5', () => {
    for (const review of REVIEWS) {
      if (review.stars !== null) {
        expect(review.stars).toBeGreaterThanOrEqual(1);
        expect(review.stars).toBeLessThanOrEqual(5);
      }
    }
  });

  it('publishes a review only with its words and names', () => {
    const base = { id: 'x', city: null, image: null, stars: null };
    expect(isPublishedReview({ ...base, names: 'Riya and Aman', quote: null })).toBe(false);
    expect(isPublishedReview({ ...base, names: 'Riya and Aman', quote: 'Lovely' })).toBe(true);
  });

  it('publishes a chat only with a screenshot and its description', () => {
    const base = { id: 'x', app: 'whatsapp' as const };
    expect(isPublishedChat({ ...base, image: '/testimonials/a.jpg', alt: null })).toBe(false);
    expect(isPublishedChat({ ...base, image: '/testimonials/a.jpg', alt: 'A thank-you' })).toBe(
      true,
    );
  });
});
