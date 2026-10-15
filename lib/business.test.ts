import { describe, expect, it } from 'vitest';

import { BUSINESS, whatsAppChatUrl } from './business';

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
