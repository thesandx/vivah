import { z } from 'zod';

import { DEFAULT_DIAL_COUNTRY, DIAL_COUNTRIES, toE164 } from '@/lib/phone';
import { todayInIndia } from '@/lib/wedding-date';

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
  .max(MAX_NAME_LENGTH, `Keep the name under ${MAX_NAME_LENGTH} characters.`);

// Lives in `lib/wedding-date.ts` so the sign-up card can use it without zod.
export { todayInIndia };

/**
 * The wedding day, `YYYY-MM-DD`, stored as a string. A wedding day is a date
 * on a calendar, not an instant, so it carries no time and no zone.
 * `null` means "I'll add this later".
 */
export const weddingDateSchema = z.iso
  .date('Enter the date as YYYY-MM-DD.')
  .refine((value) => value >= todayInIndia(), 'Pick a date that is not in the past.')
  .refine(
    (value) => Number(value.slice(0, 4)) <= Number(todayInIndia().slice(0, 4)) + MAX_YEARS_AHEAD,
    `Pick a date in the next ${MAX_YEARS_AHEAD} years.`,
  );

const countryIsos = DIAL_COUNTRIES.map((country) => country.iso) as [string, ...string[]];

export const leadRequestSchema = z
  .object({
    bride: coupleNameSchema,
    groom: coupleNameSchema,
    weddingDate: weddingDateSchema.nullable(),
    countryIso: z.enum(countryIsos).default(DEFAULT_DIAL_COUNTRY),
    phone: z.string().trim().min(1, 'Enter your WhatsApp number.').max(20),
    /** The consent tick. WhatsApp's policy needs an explicit opt-in. */
    consent: z.literal(true, 'Tick the box so we can send your preview on WhatsApp.'),
    /**
     * A honeypot. The field is hidden from people, so only a bot fills it.
     * The route accepts the request and stores nothing, so the bot learns
     * nothing from the answer.
     */
    website: z.string().max(200).optional(),
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
      isBot: body.website !== undefined && body.website.trim() !== '',
    };
  });

export type LeadRequest = z.output<typeof leadRequestSchema>;
