'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { PREVIEW_COOKIE_NAME } from '@/lib/preview-cookie';
import { inviteHref } from '@/lib/site-host';
import { checkSlug, publishWedding, type SlugAvailability } from '@/services/wedding.service';

/**
 * Server Actions for the preview page: check an address, then publish.
 *
 * Server Actions, not route handlers, because of the preview cookie. Its path
 * is `/preview/<id>`, so the browser sends it only to that path, and an action
 * posts to the page it runs on. A route under `/api/` would never see it.
 *
 * Neither action has a session. ADR-0007 records why publishing is allowed
 * without one: the preview cookie proves this is the browser the preview was
 * bound to, and that is the same proof the preview page itself relies on.
 */

/** The longest input either action reads. Longer than any valid slug. */
const MAX_INPUT_LENGTH = 100;

const slugInput = z.string().max(MAX_INPUT_LENGTH);
const leadIdInput = z.string().max(MAX_INPUT_LENGTH);

/** Is this address free? A read: it changes nothing. */
export async function checkSlugAction(slug: unknown): Promise<SlugAvailability> {
  const parsed = slugInput.safeParse(slug);
  if (!parsed.success) {
    return { available: false, reason: 'invalid', message: 'Enter an address.' };
  }
  try {
    return await checkSlug(parsed.data);
  } catch (error) {
    logger.error('Checking an address failed', error);
    throw new Error('We could not check this address. Try again.');
  }
}

export type PublishActionResult =
  { ok: true; url: string } | { ok: false; message: string; taken?: boolean };

/** What the couple reads for each way publishing can fail. */
const FAILURE: Record<string, string> = {
  taken: 'Somebody took this address a moment ago. Choose another.',
  'not-found': 'This preview link does not work. Start again on the home page.',
  expired: 'This preview has expired. Start again on the home page.',
  'other-browser': 'Open this preview on the phone that opened it first.',
};

/**
 * Publishes the invite at `slug`. TEMPORARY: the test payment button calls
 * this directly. When Cashfree is connected, the button opens a payment link
 * instead, and the Cashfree webhook publishes. See ADR-0007.
 */
export async function publishAction(leadId: unknown, slug: unknown): Promise<PublishActionResult> {
  const parsedId = leadIdInput.safeParse(leadId);
  const parsedSlug = slugInput.safeParse(slug);
  if (!parsedId.success || !parsedSlug.success) {
    return { ok: false, message: 'Choose an address first.' };
  }

  try {
    const store = await cookies();
    const result = await publishWedding(
      parsedId.data,
      store.get(PREVIEW_COOKIE_NAME)?.value,
      parsedSlug.data,
    );

    if (result.state === 'published' || result.state === 'already-published') {
      // The lead id, never the phone number. See CLAUDE.md > Authentication.
      logger.info('Wedding published', { leadId: parsedId.data, slug: result.slug });
      return { ok: true, url: inviteHref(result.slug, env.rootDomain) };
    }
    if (result.state === 'invalid') return { ok: false, message: result.message };
    return {
      ok: false,
      message: FAILURE[result.state] ?? 'Your invite was not published. Try again.',
      ...(result.state === 'taken' && { taken: true }),
    };
  } catch (error) {
    logger.error('Publishing a wedding failed', error, { leadId: parsedId.data });
    return { ok: false, message: 'Your invite was not published. Try again.' };
  }
}
