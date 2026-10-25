// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SAMPLE_VENUES, type SampleVenues } from '@/lib/sample-invite';

const recordAdminActionIn = vi.fn();
vi.mock('@/services/admin-audit.service', () => ({
  recordAdminActionIn: (...args: unknown[]) => recordAdminActionIn(...args),
}));

/** The one stored document, or null before the first save. */
let stored: SampleVenues | null = null;
let failRead = false;
const writes: Array<{ kind: string; payload: unknown }> = [];
vi.mock('@/services/repository', () => ({
  createRepository: () => ({
    get: async () => {
      if (failRead) throw new Error('unavailable');
      return stored;
    },
    runTransaction: async (
      fn: (repo: unknown, tx: unknown) => Promise<unknown>,
    ): Promise<unknown> =>
      fn(
        {
          get: async () => stored,
          createWithId: (_id: string, payload: SampleVenues) => {
            writes.push({ kind: 'create', payload });
            stored = payload;
          },
          update: (_id: string, payload: SampleVenues) => {
            writes.push({ kind: 'update', payload });
            stored = payload;
          },
        },
        {},
      ),
  }),
}));

const {
  getSampleVenues,
  getSampleVenuesForAdmin,
  resetSampleVenues,
  resetSampleVenuesCache,
  saveSampleVenues,
} = await import('@/services/sample-invite.service');

const CHANGED: SampleVenues = {
  ...DEFAULT_SAMPLE_VENUES,
  venueName: 'Taj Palace',
  venueCity: 'Chanakyapuri, New Delhi',
};

beforeEach(() => {
  stored = null;
  failRead = false;
  writes.length = 0;
  recordAdminActionIn.mockReset();
  resetSampleVenuesCache();
});

describe('getSampleVenues', () => {
  it('shows the defaults before the first save', async () => {
    expect(await getSampleVenues()).toEqual(DEFAULT_SAMPLE_VENUES);
  });

  it('shows the defaults when the read fails, and never throws', async () => {
    failRead = true;
    expect(await getSampleVenues()).toEqual(DEFAULT_SAMPLE_VENUES);
  });

  it('lets /admin see a failed read', async () => {
    failRead = true;
    await expect(getSampleVenuesForAdmin()).rejects.toThrow('unavailable');
  });
});

describe('saveSampleVenues', () => {
  it('creates the document, logs the change, and shows it at once', async () => {
    await getSampleVenues();
    const result = await saveSampleVenues(CHANGED, 'admin-uid');
    expect(result.ok).toBe(true);
    expect(writes).toEqual([{ kind: 'create', payload: CHANGED }]);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'sample-venues-changed', adminUid: 'admin-uid' }),
    );
    expect((await getSampleVenues()).venueName).toBe('Taj Palace');
  });

  it('updates an existing document, and the reset puts the defaults back', async () => {
    stored = CHANGED;
    const result = await resetSampleVenues('admin-uid');
    expect(result.ok).toBe(true);
    expect(writes).toEqual([{ kind: 'update', payload: DEFAULT_SAMPLE_VENUES }]);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'sample-venues-reset' }),
    );
    expect(await getSampleVenues()).toEqual(DEFAULT_SAMPLE_VENUES);
  });
});
