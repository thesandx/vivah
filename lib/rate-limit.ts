/**
 * A fixed-window rate limit, kept in this instance's memory. Pure apart from
 * the clock, which the caller can pass in, so it is tested without waiting.
 *
 * It is a first line of defence for the anonymous lead form (ADR-0006), not a
 * guarantee: each Cloud Run instance counts on its own, and a restart forgets.
 * That is enough to stop one browser or script from filling the `leads`
 * collection, at no cost and with no extra service.
 */

export interface RateLimitOptions {
  /** Requests allowed per key in one window. */
  limit: number;
  /** The window length in milliseconds. */
  windowMs: number;
  /** Keys kept at most; the oldest are dropped first. Bounds the memory. */
  maxKeys?: number;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export class RateLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #maxKeys: number;
  readonly #windows = new Map<string, { start: number; count: number }>();

  constructor({ limit, windowMs, maxKeys = 10_000 }: RateLimitOptions) {
    this.#limit = limit;
    this.#windowMs = windowMs;
    this.#maxKeys = maxKeys;
  }

  /** Counts one request for `key`, and says whether it may go ahead. */
  hit(key: string, now: number = Date.now()): RateLimitResult {
    const current = this.#windows.get(key);
    if (current === undefined || now - current.start >= this.#windowMs) {
      this.#windows.delete(key);
      if (this.#windows.size >= this.#maxKeys) {
        const oldest = this.#windows.keys().next().value;
        if (oldest !== undefined) this.#windows.delete(oldest);
      }
      this.#windows.set(key, { start: now, count: 1 });
      return { allowed: true };
    }
    if (current.count >= this.#limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((current.start + this.#windowMs - now) / 1000),
      };
    }
    current.count += 1;
    return { allowed: true };
  }
}

/**
 * The visitor's IP address for rate limiting. Cloudflare sets
 * `CF-Connecting-IP`; behind any other proxy, the first `X-Forwarded-For`
 * entry. `unknown` groups every request without either.
 */
export function clientIp(headers: Headers): string {
  const cloudflare = headers.get('cf-connecting-ip')?.trim();
  if (cloudflare !== undefined && cloudflare !== '') return cloudflare;
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded !== undefined && forwarded !== '' ? forwarded : 'unknown';
}
