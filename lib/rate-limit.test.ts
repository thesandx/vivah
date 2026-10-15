import { describe, expect, it } from 'vitest';

import { clientIp, RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('allows the limit, refuses the next one, and opens again after the window', () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 60_000 });
    expect(limiter.hit('a', 0)).toEqual({ allowed: true });
    expect(limiter.hit('a', 1_000)).toEqual({ allowed: true });
    expect(limiter.hit('a', 2_000)).toEqual({ allowed: false, retryAfterSeconds: 58 });
    expect(limiter.hit('b', 2_000)).toEqual({ allowed: true });
    expect(limiter.hit('a', 60_000)).toEqual({ allowed: true });
  });

  it('keeps at most maxKeys, dropping the oldest', () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    limiter.hit('a', 0);
    limiter.hit('b', 0);
    limiter.hit('c', 0);
    expect(limiter.hit('a', 1)).toEqual({ allowed: true });
  });
});

describe('clientIp', () => {
  it('prefers Cloudflare, then the first forwarded address', () => {
    expect(
      clientIp(new Headers({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' })),
    ).toBe('1.2.3.4');
    expect(clientIp(new Headers({ 'x-forwarded-for': '5.6.7.8, 10.0.0.1' }))).toBe('5.6.7.8');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
