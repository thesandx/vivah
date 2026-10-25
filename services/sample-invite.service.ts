import 'server-only';

import { SITE_CONTENT_COLLECTION } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import {
  DEFAULT_SAMPLE_VENUES,
  SAMPLE_VENUES_DOC_ID,
  type SampleVenues,
  sampleVenuesSchema,
} from '@/lib/sample-invite';
import { withTimeout } from '@/lib/utils';
import type { AdminResult } from '@/services/admin.service';
import { recordAdminActionIn } from '@/services/admin-audit.service';
import { createRepository } from '@/services/repository';

/**
 * The sample invite's venues (`lib/sample-invite.ts`), which the admin
 * changes from `/admin` without a deploy: the wedding's venue name, address
 * and map link, and each function's venue and map link.
 *
 * One document, `siteContent/sample-invite`. The id is fixed because the
 * sample reads it by key; an admin writes it a few times a year, so it is
 * never a hotspot. The home page's "Try it here" phone shows the sample
 * site itself, so one save changes both.
 */

const sampleVenues = createRepository({
  collection: SITE_CONTENT_COLLECTION,
  schema: sampleVenuesSchema,
});

/** The id is fixed and short on purpose; see the module comment. */
const ID_OPTIONS = { minLength: SAMPLE_VENUES_DOC_ID.length };

/** One instance reads the document at most once a minute. */
const CACHE_MS = 60 * 1000;

/** The sample waits this long for the venues, then shows the defaults. */
const READ_TIMEOUT_MS = 1500;

let cached: { at: number; venues: SampleVenues } | null = null;

/** Forgets the cached venues on this instance. For tests, and after a change. */
export function resetSampleVenuesCache(): void {
  cached = null;
}

async function readVenues(): Promise<SampleVenues> {
  const document = await withTimeout(
    sampleVenues.get(SAMPLE_VENUES_DOC_ID),
    READ_TIMEOUT_MS,
    'Reading the sample invite venues',
  );
  return document === null ? DEFAULT_SAMPLE_VENUES : sampleVenuesSchema.parse(document);
}

/**
 * The venues the sample shows. Cached for a minute. A failed read shows the
 * defaults and is logged; the sample never fails for it.
 */
export async function getSampleVenues(): Promise<SampleVenues> {
  if (cached !== null && Date.now() - cached.at < CACHE_MS) return cached.venues;
  try {
    const venues = await readVenues();
    cached = { at: Date.now(), venues };
    return venues;
  } catch (error) {
    logger.warn('The sample invite venues could not be read', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return DEFAULT_SAMPLE_VENUES;
  }
}

/** The saved venues, uncached, for `/admin`. A failed read throws. */
export async function getSampleVenuesForAdmin(): Promise<SampleVenues> {
  return readVenues();
}

/** Writes `venues`, with its audit entry, in one transaction. */
async function writeVenues(
  venues: SampleVenues,
  adminUid: string,
  audit: { action: 'sample-venues-changed' | 'sample-venues-reset'; detail: string },
): Promise<void> {
  await sampleVenues.runTransaction(async (repo, tx) => {
    if ((await repo.get(SAMPLE_VENUES_DOC_ID)) === null) {
      repo.createWithId(SAMPLE_VENUES_DOC_ID, venues, ID_OPTIONS);
    } else {
      repo.update(SAMPLE_VENUES_DOC_ID, venues);
    }
    recordAdminActionIn(tx, {
      action: audit.action,
      targetType: 'site',
      targetId: SAMPLE_VENUES_DOC_ID,
      detail: audit.detail,
      adminUid,
    });
  });
  resetSampleVenuesCache();
}

/** Saves the admin's venues. Only `/admin` calls this, after `requireAdmin()`. */
export async function saveSampleVenues(
  venues: SampleVenues,
  adminUid: string,
): Promise<AdminResult> {
  await writeVenues(venues, adminUid, {
    action: 'sample-venues-changed',
    detail: 'Changed the sample invite venues.',
  });
  return { ok: true, message: 'Saved. The sample invite shows the new venues within a minute.' };
}

/** Puts the default Delhi venues back. */
export async function resetSampleVenues(adminUid: string): Promise<AdminResult> {
  await writeVenues(DEFAULT_SAMPLE_VENUES, adminUid, {
    action: 'sample-venues-reset',
    detail: 'Put back the default sample invite venues.',
  });
  return { ok: true, message: 'The sample invite shows the default venues again.' };
}
