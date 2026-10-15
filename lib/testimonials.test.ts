import { describe, expect, it } from 'vitest';

import {
  bannerSchema,
  chatAlt,
  chatFieldsSchema,
  imageVersion,
  isItemId,
  isTestimonialImageFilename,
  parseKind,
  reviewFieldsSchema,
  splitHeadline,
  testimonialImageFilename,
  testimonialImageUrl,
} from '@/lib/testimonials';

describe('testimonials', () => {
  it('reads only the two kinds', () => {
    expect(parseKind('chat')).toBe('chat');
    expect(parseKind('review')).toBe('review');
    expect(parseKind('step')).toBeNull();
    expect(parseKind(undefined)).toBeNull();
  });

  it('needs the message of a chat, and trims what the admin typed', () => {
    expect(chatFieldsSchema.safeParse({ message: ' ', caption: '', app: 'whatsapp' }).success).toBe(
      false,
    );
    const parsed = chatFieldsSchema.parse({ message: ' Lovely ', caption: '', app: 'instagram' });
    expect(parsed.message).toBe('Lovely');
    expect(chatFieldsSchema.safeParse({ message: 'Hi', caption: '', app: 'sms' }).success).toBe(
      false,
    );
  });

  it('takes a star rating from 1 to 5 only, from a form string', () => {
    const base = { quote: 'Lovely', names: 'Riya & Aman', relation: '' };
    expect(reviewFieldsSchema.parse({ ...base, stars: '5' }).stars).toBe(5);
    expect(reviewFieldsSchema.safeParse({ ...base, stars: '0' }).success).toBe(false);
    expect(reviewFieldsSchema.safeParse({ ...base, stars: '6' }).success).toBe(false);
    expect(reviewFieldsSchema.safeParse({ ...base, names: '', stars: '5' }).success).toBe(false);
  });

  it('lets the banner line be empty, which hides it', () => {
    expect(bannerSchema.parse({ headline: '  ' }).headline).toBe('');
  });

  it('names each upload for its kind, and knows its own names', () => {
    const name = testimonialImageFilename('chat', 'image/webp', 'a1b2-c3d4');
    expect(name).toBe('chat-a1b2c3d4.webp');
    expect(isTestimonialImageFilename('chat', name)).toBe(true);
    expect(isTestimonialImageFilename('review', name)).toBe(false);
    expect(isTestimonialImageFilename('chat', 'chat-a1.svg')).toBe(false);
  });

  it('puts the image version in the URL, so a new upload gets a new URL', () => {
    const path = 'siteContent/home-reviews/review-abc123.jpg';
    expect(imageVersion(path)).toBe('abc123');
    expect(testimonialImageUrl('review', 'Doc1234567890', path)).toBe(
      '/api/testimonials/review/Doc1234567890?v=abc123',
    );
  });

  it('accepts only ids shaped like a Firestore auto id', () => {
    expect(isItemId('AbCdEf1234567890XyZ1')).toBe(true);
    expect(isItemId('../secret')).toBe(false);
    expect(isItemId('short')).toBe(false);
  });

  it('lifts the number out of the banner line', () => {
    expect(splitHeadline('Loved by 500+ happy couples')).toEqual({
      before: 'Loved by ',
      highlight: '500+',
      after: ' happy couples',
    });
    expect(splitHeadline('Loved by couples')).toEqual({
      before: 'Loved by couples',
      highlight: '',
      after: '',
    });
  });

  it('describes a screenshot for a screen reader', () => {
    expect(chatAlt({ app: 'whatsapp', message: 'Thank you' })).toBe(
      'A WhatsApp chat. The message says: Thank you',
    );
  });
});
