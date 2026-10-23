// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { campaignFrom, classifySource } from '@/lib/visit-tracking';

import { GET } from './route';

describe('GET /ig', () => {
  it('redirects to the home page with a relative, temporary Location', () => {
    const response = GET();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      '/?utm_source=instagram&utm_medium=organic&utm_campaign=bio',
    );
  });

  it('carries tags the Visitors report reads as Instagram, campaign bio', () => {
    const location = GET().headers.get('location') ?? '';
    const search = location.slice(location.indexOf('?'));
    expect(classifySource(search, '', 'vivah.online')).toBe('instagram');
    expect(campaignFrom(search)).toBe('bio');
  });
});
