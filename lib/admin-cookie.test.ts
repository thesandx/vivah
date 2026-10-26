import { describe, expect, it } from 'vitest';

import { ADMIN_COOKIE_NAME, adminCookie, clearedAdminCookie, maskPhone } from '@/lib/admin-cookie';

describe('admin cookie', () => {
  it('is httpOnly and lax, so a link from the Telegram alert keeps it, and never named __session', () => {
    const cookie = adminCookie('token', 600, true);
    expect(cookie).toMatchObject({
      name: ADMIN_COOKIE_NAME,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    expect(ADMIN_COOKIE_NAME).not.toBe('__session');
  });

  it('clears with an empty value and no lifetime', () => {
    expect(clearedAdminCookie(false)).toMatchObject({ value: '', maxAge: 0, secure: false });
  });

  it('shows only the last three digits of the admin phone', () => {
    expect(maskPhone('+919546342507')).toBe('+91 ••••• ••507');
    expect(maskPhone('+6591234567')).toBe('••••• ••567');
  });
});
