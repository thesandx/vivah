/**
 * What a couple may change about their invite from the dashboard, and who may
 * change it. Pure, so the form rules and the permission check are tested
 * without a request or a database.
 */

import { z } from 'zod';

import { isGoogleMapsUrl } from '@/lib/invite-contact';

/** An empty field clears the value: `''` becomes `null`. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((value) => (value === '' ? null : value));

/**
 * The editable details, as the dashboard form sends them. The slug is not
 * here on purpose: changing it would break every link already shared with
 * guests.
 */
export const weddingDetailsSchema = z.object({
  bride: z.string().trim().min(1, "Enter the bride's name.").max(60),
  groom: z.string().trim().min(1, "Enter the groom's name.").max(60),
  weddingDate: z
    .union([z.literal(''), z.iso.date('Enter a date like 2026-03-09.')])
    .transform((value) => (value === '' ? null : value)),
  ceremonyTime: z
    .union([
      z.literal(''),
      z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a time like 19:00.'),
    ])
    .transform((value) => (value === '' ? null : value)),
  venueName: optionalText(80),
  venueCity: optionalText(80),
  venueMapsUrl: optionalText(500).refine(
    (value) => value === null || isGoogleMapsUrl(value),
    'Paste the link from Google Maps > Share.',
  ),
});

export type WeddingDetails = z.output<typeof weddingDetailsSchema>;

export type DetailsResult =
  | { ok: true; details: WeddingDetails }
  | { ok: false; errors: Partial<Record<keyof WeddingDetails, string>> };

/** Reads the form. Each problem is keyed by its field, for the form to show. */
export function parseWeddingDetails(form: Record<string, unknown>): DetailsResult {
  const text = (key: string): string => {
    const value = form[key];
    return typeof value === 'string' ? value : '';
  };
  const parsed = weddingDetailsSchema.safeParse({
    bride: text('bride'),
    groom: text('groom'),
    weddingDate: text('weddingDate'),
    ceremonyTime: text('ceremonyTime'),
    venueName: text('venueName'),
    venueCity: text('venueCity'),
    venueMapsUrl: text('venueMapsUrl'),
  });
  if (parsed.success) return { ok: true, details: parsed.data };
  const errors: Partial<Record<keyof WeddingDetails, string>> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof WeddingDetails | undefined;
    if (key !== undefined && errors[key] === undefined) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/**
 * Who may edit a wedding from the couple dashboard: the couple, signed in with
 * the number they paid from. The phone number is the one Firebase verified
 * with an OTP, never one the caller typed into a form. The admin edits from
 * `/admin`, behind its own two-step sign-in (ADR-0008), not from here.
 */
export function canEditWedding(phoneE164: string | null, ownerPhoneE164: string): boolean {
  return phoneE164 !== null && phoneE164 === ownerPhoneE164;
}
