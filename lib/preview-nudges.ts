/**
 * The daily WhatsApp nudges for a preview that is not paid. Pure, so every
 * rule is tested without a database or a clock.
 *
 * The admin sends one message a day for seven days after the preview, by
 * hand from the WhatsApp Business app. Day 1 is the calendar day after the
 * couple asked, in India. Nothing records a sent nudge: the day comes from
 * the date alone, so a missed day is skipped, not queued.
 *
 * The preview closes 30 minutes after it opens, so every message asks the
 * couple to reply "open". The admin then reactivates it. The link goes last:
 * WhatsApp on Android shows no link preview when more text follows the link.
 */

import { coupleNames, type NameOrder } from '@/lib/couple-names';
import { buildCoupleSlug } from '@/lib/couple-slug';
import { daysUntil, todayInIndia } from '@/lib/wedding-date';

/** How many daily nudges a preview gets. */
export const NUDGE_DAYS = 7;

export interface NudgeLead {
  status: string;
  createdAt: Date;
  deletedAt: Date | null;
  /** `YYYY-MM-DD`, or `null`. */
  weddingDate: string | null;
}

/**
 * Where a preview is in its nudges. `due` names today's day (1 to 7).
 * `starts` means the first nudge goes tomorrow. `none` means no nudge: the
 * preview is paid or deleted, the week is over, or the wedding has passed.
 */
export type NudgeStatus =
  | { kind: 'due'; day: number }
  | { kind: 'starts' }
  | { kind: 'none'; reason: 'paid' | 'deleted' | 'finished' | 'wedding-passed' };

export function nudgeStatus(lead: NudgeLead, now: Date): NudgeStatus {
  if (lead.deletedAt !== null) return { kind: 'none', reason: 'deleted' };
  if (lead.status === 'paid') return { kind: 'none', reason: 'paid' };
  const today = todayInIndia(now);
  if (lead.weddingDate !== null) {
    const untilWedding = daysUntil(lead.weddingDate, today);
    if (untilWedding !== null && untilWedding <= 0) {
      return { kind: 'none', reason: 'wedding-passed' };
    }
  }
  const day = daysUntil(today, todayInIndia(lead.createdAt)) ?? 0;
  if (day <= 0) return { kind: 'starts' };
  if (day > NUDGE_DAYS) return { kind: 'none', reason: 'finished' };
  return { kind: 'due', day };
}

/** The admin's short line for the list: "Nudge due · Day 3 of 7". */
export function nudgeLabel(status: NudgeStatus): string | null {
  if (status.kind === 'due') return `Nudge due · Day ${status.day} of ${NUDGE_DAYS}`;
  if (status.kind === 'starts') return 'First nudge tomorrow';
  if (status.reason === 'finished') return 'Nudges done';
  return null;
}

export interface NudgeInput {
  bride: string;
  groom: string;
  /** Whose name comes first in the greeting. Absent: the bride's. */
  nameOrder?: NameOrder | undefined;
  /** The preview link, `https://vivah.online/p/<id>`. */
  link: string;
  /** The root domain, `vivah.online`, for the couple's address on day 6. */
  rootDomain: string;
}

/** The topic of each day's message, for the admin. */
export const NUDGE_TOPICS: readonly string[] = [
  'Every guest gets their own invite',
  'What your guests will see',
  'Show the family',
  'One price for every guest',
  'No more forwarding PDFs',
  'The address is not held',
  'Gentle last message',
];

/** The message for one day (1 to 7). Throws for any other day. */
export function nudgeMessage(day: number, input: NudgeInput): string {
  const hello = `Namaste ${coupleNames(input)} 🙏`;
  const sign = 'Team Vivah 💛';
  const slug = buildCoupleSlug(input.bride, input.groom);
  const address = slug === null ? 'Your own vivah.online address' : `${slug}.${input.rootDomain}`;
  const bodies: readonly string[] = [
    'Did you see the best part? 💌 Every guest gets their own link with their name on it: "Hi Mausi ji, you are invited" ✨\nReply "open" and we will open your preview again.',
    'Your invite has a Ganesh card, your song, a scratch-to-reveal date 🎉, a countdown, Google Maps to the venue 📍 and one-tap RSVP on WhatsApp.\nJust reply "open" to see it again 😊',
    'Show it to Mummy-Papa once 👨‍👩‍👧 It opens straight from WhatsApp. No app, no login, easy for Dadi-Nani too 💕\nReply "open" and we will open it for 30 minutes.',
    'One payment covers every guest, with no charge per person 🙌 You can change the date, time or venue later, and every guest\'s link updates on its own ✍️\nReply "open" to see it again.',
    'No more forwarding PDFs and answering "venue kahan hai?" 50 times 😄 One link per guest has the date, time, map and RSVP.\nReply "open" whenever you are free.',
    `${address} is still free ✨ We do not hold it, so the first couple to go live gets it.\nReply "open" and we will open your preview.`,
    'This is our last reminder, we promise 😊 Your invite is ready whenever you are 💌\nReply "open" any time, then pay and make it yours. Wishing you both a beautiful wedding 🎉',
  ];
  const body = bodies[day - 1];
  if (body === undefined) throw new Error(`No nudge for day ${day}`);
  return `${hello}\n${body}\n${sign}\n\n${input.link}`;
}

/** The message after the admin reactivates a preview the couple asked to open. */
export function openAgainMessage(
  input: Pick<NudgeInput, 'bride' | 'groom' | 'nameOrder' | 'link'>,
): string {
  return `Namaste ${coupleNames(input)} 🙏✨\nYour invite is open again 💌 It stays open for 30 minutes. Love it? Pay and make it yours 💍 Tap "Pay and publish" at the bottom, then share it with all your guests 🎉\nTeam Vivah 💛\n\n${input.link}`;
}
