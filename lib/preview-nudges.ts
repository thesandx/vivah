/**
 * The daily WhatsApp nudges for a preview that is not paid. Pure, so every
 * rule is tested without a database or a clock.
 *
 * The admin sends one message a day for seven days after the preview, by
 * hand from the WhatsApp Business app, at about 11 AM. Day 1 is the calendar
 * day after the couple asked, in India. A preview made before 6 AM in India
 * is an exception: its day 1 is that same day, because the 11 AM nudge is
 * still hours away. Nothing records a sent nudge: the day comes from the date
 * alone, so a missed day is skipped, not queued.
 *
 * The preview closes 30 minutes after it opens, so a nudge does not send
 * the preview link. It sends the sample invite and asks the couple to make
 * a fresh free preview on the site. The sign-off goes last, after the
 * sample link, as the product owner asked.
 */

import { PRICE_FROM_RUPEES } from '@/lib/business';
import { coupleNames, type NameOrder } from '@/lib/couple-names';
import { buildCoupleSlug } from '@/lib/couple-slug';
import { formatRupees } from '@/lib/coupons';
import { SAMPLE_GUEST, SAMPLE_SLUG } from '@/lib/sample-invite';
import { daysUntil, todayInIndia } from '@/lib/wedding-date';

/** How many daily nudges a preview gets. */
export const NUDGE_DAYS = 7;

/** A preview made before this hour in India gets its day 1 nudge the same day. */
export const SAME_DAY_BEFORE_HOUR = 6;

/** The hour, 0 to 23, on the clock in India. */
function hourInIndia(date: Date): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return Number(hour);
}

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
  const sameDay = hourInIndia(lead.createdAt) < SAME_DAY_BEFORE_HOUR ? 1 : 0;
  const day = (daysUntil(today, todayInIndia(lead.createdAt)) ?? -1) + sameDay;
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
  /** The root domain, `vivah.online`, for the couple's address on day 6. */
  rootDomain: string;
}

/** The topic of each day's message, for the admin. */
export const NUDGE_TOPICS: readonly string[] = [
  'An address in both your names',
  'Your song plays when the invite opens',
  'Every guest gets their own invite',
  'It opens with Ganesh ji',
  'Guests scratch to reveal the date',
  'Every function and venue in one place',
  'An invite they will remember',
];

/**
 * The message for one day (1 to 7). Throws for any other day. Each message
 * tells the couple their wedding is special, and names one feature of the
 * invite that matches it.
 */
export function nudgeMessage(day: number, input: NudgeInput): string {
  const hello = `Namaste ${coupleNames(input)} 🙏`;
  const sign = 'Team Vivah 💛';
  const slug = buildCoupleSlug(input.bride, input.groom);
  const address =
    slug === null
      ? `aapki website ka address aap dono ke naam se, ${input.rootDomain} pe`
      : `aapki website ka address aap dono ke naam se: ${slug}.${input.rootDomain}`;
  const bodies: readonly string[] = [
    `Aapki shaadi special hai, toh uska naam bhi special hona chahiye 💑 Jaise Virat-Anushka bane "Virushka", waise hi ${address} ✨\nYa apna koi pyaara sa naam chun lijiye. Ek pehchaan, jo sirf aapki hai 💕`,
    'Socho, guest ne aapka special invite khola aur aapka chuna hua gaana bajne laga 🎶 Shaadi ka mahaul invite khulte hi shuru ho jaata hai ✨\nAisa invite koi bhool nahi paayega 💕',
    'Aapki special shaadi mein har mehmaan khaas hai 💌 Isliye har guest ko milta hai unka apna link, unke naam ke saath: "Dear Mausi ji, you are invited".\nBilkul paper card wali izzat, ab WhatsApp pe 🥰',
    'Har shubh kaam Ganesh ji se shuru hota hai 🙏 Isliye aapka special invite bhi Ganesh ji ke card se khulta hai.\nEk tap, aur aapki shaadi ki pehli jhalak saamne 🌸',
    'Aapki shaadi ki date ek special surprise hai 🎁 Guests scratch karke date reveal karte hain, phir confetti aur phoolon ki baarish 🎉🌸\nYe pal sabke chehre pe smile le aata hai 😍',
    'Haldi, Mehendi, Sangeet, Shaadi 💃 Aapke har special function ka time aur venue ek hi jagah, Google Maps ke saath 📍 Aur shaadi tak ka countdown ⏳\nNani ji bhi seedha WhatsApp se khol lengi 💕',
    `Saalon baad bhi aapke apne kahenge: "Yaad hai unka wedding invite? Kitna special tha!" 💛 Aur jab poochenge "bahut mehenga hoga?", aap kehna "bas ${formatRupees(PRICE_FROM_RUPEES)}" 😎\nYe hamara last reminder hai, promise 😊 Aapki shaadi bahut yaadgaar ho 🎉`,
  ];
  const body = bodies[day - 1];
  if (body === undefined) throw new Error(`No nudge for day ${day}`);
  const sample = `https://${SAMPLE_SLUG}.${input.rootDomain}/${SAMPLE_GUEST}`;
  return [
    `${hello}\n${body}`,
    `Create your own free preview at https://${input.rootDomain}`,
    `Ek baar ye sample invite zaroor dekhiye, aapka bhi bilkul aisa hi banega 👇\n${sample}`,
    sign,
  ].join('\n\n');
}

/** The message after the admin reactivates a preview the couple asked to open. */
export function openAgainMessage(
  input: Pick<NudgeInput, 'bride' | 'groom' | 'nameOrder'> & {
    /** The preview link, `https://vivah.online/p/<id>`. */
    link: string;
  },
): string {
  return `Namaste ${coupleNames(input)} 🙏✨\nYour invite is open again 💌 It stays open for 30 minutes. Love it? Pay and make it yours 💍 Tap "Pay and publish" at the bottom, then share it with all your guests 🎉\nTeam Vivah 💛\n\n${input.link}`;
}
