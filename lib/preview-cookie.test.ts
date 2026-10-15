import { describe, expect, it } from 'vitest';

import { PREVIEW_COOKIE_NAME, PREVIEW_LIFETIME_SECONDS, previewCookie } from '@/lib/preview-cookie';

describe('previewCookie', () => {
  it('scopes the cookie to one preview and keeps it from script', () => {
    expect(previewCookie('abc', 'token', true)).toEqual({
      name: PREVIEW_COOKIE_NAME,
      value: 'token',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/preview/abc',
      maxAge: PREVIEW_LIFETIME_SECONDS,
    });
  });

  it('drops Secure only for plain-HTTP local development', () => {
    expect(previewCookie('abc', 'token', false).secure).toBe(false);
  });
});
