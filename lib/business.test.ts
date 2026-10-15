import { describe, expect, it } from 'vitest';

import { BUSINESS, whatsAppChatUrl, whatsAppShareUrl } from './business';

describe('whatsAppChatUrl', () => {
  it('opens a chat with the number and the message typed in', () => {
    expect(whatsAppChatUrl('+919546342507', 'Hi there')).toBe(
      'https://wa.me/919546342507?text=Hi%20there',
    );
  });

  it('refuses something that is not a phone number', () => {
    expect(() => whatsAppChatUrl('call me', 'Hi')).toThrow();
  });

  it('keeps the support number in E.164', () => {
    expect(BUSINESS.whatsAppE164).toMatch(/^\+\d{8,15}$/);
  });
});

describe('whatsAppShareUrl', () => {
  it('opens the contact picker with the message typed in', () => {
    expect(whatsAppShareUrl('Hi Rahul https://sara.vivah.online/Rahul')).toBe(
      'https://wa.me/?text=Hi%20Rahul%20https%3A%2F%2Fsara.vivah.online%2FRahul',
    );
  });
});
