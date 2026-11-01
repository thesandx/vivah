/**
 * The follow-up message for a couple who made a preview and has not paid.
 * Pure, so it is tested alone.
 *
 * A couple who just made a preview is still thinking about it. A message from
 * a person either helps them pay or tells us why they did not (Sandeep,
 * 2026-10-29). The admin decides when to send it, by hand from the WhatsApp
 * Business app. The daily nudges in `lib/preview-nudges.ts` are separate.
 *
 * The wording follows a sales call method Sandeep chose (2026-11-01): use
 * their names with "ji", give them control to say no, ask one question that
 * shows how serious they are, and sound like a helper, not a seller. It holds
 * no preview link and offers no call (Sandeep): it points to the site and the
 * sample invite instead. It is short and signed by Anushka from Team Vivah
 * (Sandeep, 2026-11-01).
 */

import { type NameOrder, orderedNames } from '@/lib/couple-names';
import { SAMPLE_GUEST, SAMPLE_SLUG } from '@/lib/sample-invite';

export interface FollowUpInput {
  bride: string;
  groom: string;
  /** Whose name comes first in the greeting. Absent: the bride's. */
  nameOrder?: NameOrder | undefined;
  /** The address the couple chose at sign-up, `priya-rahul`. Absent: none. */
  slug?: string | undefined;
  /** The root domain, `vivah.online`. */
  rootDomain: string;
}

/**
 * The message. Anushka greets them and names their chosen address when there
 * is one, asks when the invites go out, offers help, lets them stop the
 * messages with one word, then gives the sample invite and the site.
 */
export function followUpMessage(input: FollowUpInput): string {
  const [first, second] = orderedNames(input);
  const address = input.slug === undefined ? '' : `: ${input.slug}.${input.rootDomain}`;
  const sample = `https://${SAMPLE_SLUG}.${input.rootDomain}/${SAMPLE_GUEST}`;
  return [
    `Namaste ${first} ji & ${second} ji 🙏\nMain Anushka, Team Vivah se. Aapne apni shaadi ka invite banaya tha${address} 💛`,
    'Invites kab tak bhejne ka plan hai? Kuch bhi atka ho toh bataiye, main help kar dungi 😊 Sab final ho gaya hai toh bas "done" likh dijiye 🙏',
    `Sample invite 👇\n${sample}\n\nApna banaiye: https://${input.rootDomain}`,
    'Anushka, Team Vivah 💛',
  ].join('\n\n');
}
