/**
 * How a couple's invite opens: with Shri Ganesh and the Ganesh shloka, as
 * every Hindu card does, or with Bhagwan Mahaveer and the Jain Mangal shloka
 * for a Jain family. The choice changes the gate card, the top of the invite and
 * the WhatsApp share card, and nothing else: the maroon-and-gold look stays.
 *
 * Only an admin sets it, on `/admin/previews/<id>` or `/admin/invites/<id>`.
 * Absent means Shri Ganesh, as every invite showed before the choice existed,
 * so older leads and weddings need no backfill. Pure, so the invite, the gate
 * and the share card read the same text.
 */

export const INVITE_OPENINGS = ['ganesh', 'jain'] as const;
export type InviteOpening = (typeof INVITE_OPENINGS)[number];

export const DEFAULT_INVITE_OPENING: InviteOpening = 'ganesh';

/** What the choice is called on `/admin`. */
export const INVITE_OPENING_LABELS: Record<InviteOpening, string> = {
  ganesh: 'Shri Ganesh, with the Ganesh shloka',
  jain: 'Bhagwan Mahaveer, with the Jain Mangal shloka',
};

export interface InviteOpeningText {
  /** The `lang` of the lines. Both prayers are Sanskrit. */
  lang: 'sa';
  /** Show "॥ ॐ ॥" over the lines. The Jain card leaves it out. */
  om: boolean;
  /** The lines under the picture at the top of the invite, first line the salutation. */
  lines: readonly string[];
  /** The one line on the gate card, under the picture. */
  coverTitle: string;
}

export const INVITE_OPENING_TEXT: Record<InviteOpening, InviteOpeningText> = {
  // "O Lord Ganesha, of the curved trunk and mighty body, as bright as a
  // million suns, remove every obstacle from all my work, always."
  ganesh: {
    lang: 'sa',
    om: true,
    lines: [
      '॥ श्री गणेशाय नमः ॥',
      'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।',
      'निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥',
    ],
    coverTitle: 'श्री गणेशाय नमः',
  },
  // The Jain Mangal shloka, as on the product owner's Jain card (2026-11-03):
  // "Auspicious is Bhagwan Mahavir, auspicious is Gautam the Ganadhar,
  // auspicious are Kundakunda and the acharyas; may the Jain dharma be
  // auspicious." The spelling follows that card.
  jain: {
    lang: 'sa',
    om: false,
    lines: [
      '॥ श्री महावीराय नमः ॥',
      'मंगलम् भगवान वीरो, मंगलम् गौतमो गणी ।',
      'मंगलम् कुन्द कुन्दाद्यौ, जैन धर्मोस्तु मंगलम् ॥',
    ],
    coverTitle: 'श्री महावीराय नमः',
  },
};

/** `'jain'` → `'jain'`; anything else → `null`. */
export function parseInviteOpening(value: unknown): InviteOpening | null {
  return INVITE_OPENINGS.find((opening) => opening === value) ?? null;
}
