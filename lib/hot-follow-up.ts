/**
 * The "hot lead" follow-up: one WhatsApp message to a couple who made a
 * preview and did not pay within the first 10 minutes. Pure, so every rule is
 * tested without a database or a clock.
 *
 * A couple who just made a preview is still thinking about it. A message from
 * a person at that moment either helps them pay or tells us why they did not
 * (Sandeep, 2026-10-29). The admin sends it by hand from the WhatsApp Business
 * app, like the daily nudges in `lib/preview-nudges.ts`, which take over from
 * the next day.
 *
 * Nothing records a sent follow-up. The window comes from the time alone, so
 * the admin sees "Hot" for the whole window and decides.
 */

import { coupleNames, type NameOrder } from '@/lib/couple-names';

/** Minutes after the preview with no payment before the couple is a hot lead. */
export const HOT_AFTER_MINUTES = 10;

/** Hours after the preview when the hot window ends and the daily nudges wait. */
export const HOT_UNTIL_HOURS = 6;

const MINUTE_MS = 60_000;

export interface HotLead {
  status: string;
  createdAt: Date;
  deletedAt: Date | null;
}

/**
 * Where a preview is in its hot window. `soon` gives the minutes until it
 * starts. `none` means no follow-up: the preview is paid or deleted, or the
 * window has passed.
 */
export type HotStatus =
  | { kind: 'soon'; minutesLeft: number }
  | { kind: 'hot'; minutesSince: number }
  | { kind: 'none'; reason: 'paid' | 'deleted' | 'passed' };

/** When the couple becomes a hot lead, if they have not paid by then. */
export function hotFollowUpAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + HOT_AFTER_MINUTES * MINUTE_MS);
}

export function hotStatus(lead: HotLead, now: Date): HotStatus {
  if (lead.deletedAt !== null) return { kind: 'none', reason: 'deleted' };
  if (lead.status === 'paid') return { kind: 'none', reason: 'paid' };
  const minutesSince = Math.floor((now.getTime() - lead.createdAt.getTime()) / MINUTE_MS);
  if (minutesSince < HOT_AFTER_MINUTES) {
    return { kind: 'soon', minutesLeft: HOT_AFTER_MINUTES - minutesSince };
  }
  if (minutesSince >= HOT_UNTIL_HOURS * 60) return { kind: 'none', reason: 'passed' };
  return { kind: 'hot', minutesSince };
}

/** The admin's short line for the list: "Hot · not paid after 25 min · follow up now". */
export function hotLabel(status: HotStatus): string | null {
  if (status.kind !== 'hot') return null;
  return `Hot · not paid after ${formatMinutes(status.minutesSince)} · follow up now`;
}

/** `25 min`, or `2 h 5 min` from an hour up. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export interface HotMessageInput {
  bride: string;
  groom: string;
  /** Whose name comes first in the greeting. Absent: the bride's. */
  nameOrder?: NameOrder | undefined;
  /** The preview link, `https://vivah.online/p/<id>`. */
  link: string;
}

/**
 * The message. It asks how the invite looked, offers help with the usual
 * blockers, and asks for one line of feedback if they will not buy. The link
 * goes before the sign-off, as in the daily nudges.
 */
export function hotFollowUpMessage(input: HotMessageInput): string {
  return [
    `Namaste ${coupleNames(input)} 🙏`,
    'Aapne apna wedding invite dekha? Kaisa laga? 😊',
    'Kuch badalna hai, ya price, payment ya details ke baare mein koi sawaal hai? Bas yahin reply kijiye, hum abhi help karenge 💛',
    'Abhi nahi lena? Koi baat nahi 🙏 Bas ek line mein bata dijiye kyun. Isse hum Vivah ko aur behtar bana payenge.',
    `Aapka invite yahan hai. Link band ho gaya ho toh reply kijiye, hum dobara khol denge 👇\n${input.link}`,
    'Team Vivah 💛',
  ].join('\n\n');
}
