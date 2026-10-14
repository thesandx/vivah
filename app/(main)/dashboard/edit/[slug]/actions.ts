'use server';

import type { SaveState } from '@/components/dashboard/WeddingDetailsForm';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { requireUser } from '@/services/auth.service';
import { updateWeddingDetails } from '@/services/wedding.service';

/**
 * Saves a couple's invite details from the dashboard.
 *
 * `requireUser()` first: a Server Action is a public endpoint, whatever page
 * shows the form. The caller's phone number comes from the verified session.
 * `updateWeddingDetails` then checks that it owns the wedding, or is an admin.
 */
export async function saveWeddingDetailsAction(
  slug: string,
  _state: SaveState,
  form: FormData,
): Promise<SaveState> {
  const user = await requireUser();
  try {
    const fields = Object.fromEntries(
      [...form.entries()].filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
    const result = await updateWeddingDetails(
      slug,
      user.phoneNumber,
      env.adminPhoneNumbers,
      fields,
    );
    if (result.ok) {
      logger.info('Wedding details saved', { slug, uid: user.uid });
      return { status: 'saved' };
    }
    if (result.reason === 'invalid') {
      return {
        status: 'error',
        message: 'Some details need a fix. See the fields marked below.',
        ...(result.errors !== undefined && { errors: result.errors }),
      };
    }
    return { status: 'error', message: 'This invite is not on your number.' };
  } catch (error) {
    logger.error('Saving wedding details failed', error, { slug, uid: user.uid });
    return { status: 'error', message: 'Your changes were not saved. Try again.' };
  }
}
