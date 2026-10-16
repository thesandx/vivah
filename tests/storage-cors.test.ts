// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * Guards cloud/storage-cors.json, the bucket CORS that lets a browser upload.
 *
 * Every admin upload (review photos, chat screenshots, how-it-works screens,
 * songs) is a PUT from the site to a signed URL on storage.googleapis.com. The
 * bucket refuses that preflight unless it lists the site's origin, and the
 * upload then fails with no server log at all. The deploy workflow checks the
 * live bucket against this file; this test checks the file itself.
 */

const root = fileURLToPath(new URL('..', import.meta.url));

const corsRule = z.object({
  origin: z.array(z.string()).min(1),
  method: z.array(z.string()).min(1),
  responseHeader: z.array(z.string()),
  maxAgeSeconds: z.number().int().positive(),
});

const rules = z
  .array(corsRule)
  .min(1)
  .parse(JSON.parse(readFileSync(`${root}cloud/storage-cors.json`, 'utf8')));

describe('cloud/storage-cors.json', () => {
  const origins = rules.flatMap((rule) => rule.origin);

  it('allows the live site and the Cloud Run URL', () => {
    expect(origins).toContain('https://vivah.online');
    expect(origins.some((origin) => origin.endsWith('.run.app'))).toBe(true);
  });

  it('lists exact https origins only: no wildcard, path or trailing slash', () => {
    for (const origin of origins) {
      expect(origin).toMatch(/^https:\/\/[a-z0-9.-]+$/);
    }
  });

  it('allows the PUT and the headers the signed upload sends', () => {
    for (const rule of rules) {
      expect(rule.method).toContain('PUT');
      expect(rule.responseHeader).toEqual(
        expect.arrayContaining(['Content-Type', 'x-goog-content-length-range']),
      );
    }
  });
});
