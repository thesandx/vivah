import { z } from 'zod';

import { slugProblem } from '@/lib/couple-slug';
import { parseGclid } from '@/lib/google-ads';
import { capitalizeName } from '@/lib/guest-name';
import { toE164 } from '@/lib/phone';
import { todayInIndia } from '@/lib/wedding-date';
import { parseSongSlot } from '@/lib/wedding-songs';

/**
 * The body of `POST /api/leads`: what a couple types on the home page.
 *
 * In `lib/` because both sides read it: the route validates the request, and
 * the form shows the same limits. Pure, so a test needs no network.
 *
 * The phone arrives as the country and the national number, as typed. The
 * server turns it into E.164 with `toE164`, so the browser cannot store a
 * number in a shape the rest of the app does not expect.
 */

/** Longest name we accept. Long enough for "Raadha Rani Kumari", short enough for a link. */
export const MAX_NAME_LENGTH = 60;

/** A wedding is planned ahead, but not by decades. */
const MAX_YEARS_AHEAD = 3;

export const coupleNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a name.')
  .max(MAX_NAME_LENGTH, `Keep the name under ${MAX_NAME_LENGTH} characters.`)
  // Saved as `Riya`, however it was typed (`riya`, `RIYA`).
  .transform(capitalizeName);

// Lives in `lib/wedding-date.ts` so the sign-up card can use it without zod.
export { todayInIndia };

/**
 * The wedding day, `YYYY-MM-DD`, stored as a string. A wedding day is a date
 * on a calendar, not an instant, so it carries no time and no zone.
 */
export const weddingDateSchema = z.iso
  .date('Enter the date as YYYY-MM-DD.')
  .refine((value) => value >= todayInIndia(), 'Pick today or a later date.')
  .refine(
    (value) => Number(value.slice(0, 4)) <= Number(todayInIndia().slice(0, 4)) + MAX_YEARS_AHEAD,
    `Pick a date in the next ${MAX_YEARS_AHEAD} years.`,
  );

export const leadRequestSchema = z
  .object({
    bride: coupleNameSchema,
    groom: coupleNameSchema,
    /**
     * Required, so every preview has a date to scratch and a countdown.
     * Leads stored before this rule may still have `null`.
     */
    weddingDate: z.string('Choose your wedding date.').pipe(weddingDateSchema),
    /** Indian numbers only: the couples and our WhatsApp templates are in India. */
    countryIso: z.literal('IN', 'We accept Indian (+91) numbers only.').default('IN'),
    phone: z.string().trim().min(1, 'Enter your WhatsApp number.').max(20),
    /**
     * The old WhatsApp tick. The card no longer has it: a note beside the
     * number says we send the link there, and submitting with that note in
     * view is the opt-in (`lead.consentAt`). Still accepted, so a page cached
     * with the tick keeps working.
     */
    consent: z.boolean().optional(),
    /**
     * The invite address the couple chose on step 3: `radha-shyam`. Optional,
     * so a page cached before step 3 existed still works; the preview page
     * then offers addresses instead. Nothing is reserved until publishing.
     */
    slug: z
      .string()
      .max(100)
      .superRefine((value, context) => {
        const problem = slugProblem(value);
        if (problem !== null) context.addIssue({ code: 'custom', message: problem });
      })
      .optional(),
    /**
     * The song the couple chose on step 4, by slot. Optional: the step shows
     * only when an admin has added songs. The server copies the song itself
     * onto the lead, so the body never names a file.
     */
    songSlot: z
      .number()
      .int()
      .refine((value) => parseSongSlot(value) !== null, 'Choose one of the songs.')
      .optional(),
    /**
     * A honeypot. The field is hidden from people, so only a bot fills it.
     * The route accepts the request and stores nothing, so the bot learns
     * nothing from the answer.
     */
    website: z.string().max(200).optional(),
    /**
     * The Google Ads click id, sent only when the visitor accepted the ad
     * cookie (ADR-0013). Kept on the lead so a payment made in another
     * browser can still be matched to the ad by an upload.
     */
    gclid: z
      .string()
      .refine((value) => parseGclid(value) === value, 'Not a Google click id.')
      .optional(),
  })
  .strict()
  .transform((body, context) => {
    const phone = toE164(body.countryIso, body.phone);
    if (!phone.ok) {
      context.addIssue({ code: 'custom', path: ['phone'], message: phone.message });
      return z.NEVER;
    }
    return {
      bride: body.bride,
      groom: body.groom,
      weddingDate: body.weddingDate,
      phoneE164: phone.e164,
      slug: body.slug ?? null,
      songSlot: body.songSlot === undefined ? null : parseSongSlot(body.songSlot),
      isBot: body.website !== undefined && body.website.trim() !== '',
      ...(body.gclid !== undefined && { gclid: body.gclid }),
    };
  });

export type LeadRequest = z.output<typeof leadRequestSchema>;
