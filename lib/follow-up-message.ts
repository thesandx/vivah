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
 * sample invite instead, as the daily nudges do.
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
 * The message. It names their chosen address when there is one, lets them
 * stop the messages with one word, asks when the invites go out, offers help
 * with the usual blockers, then gives the site and the sample invite. The
 * sample link goes just before the sign-off, as in the daily nudges.
 */
export function followUpMessage(input: FollowUpInput): string {
  const [first, second] = orderedNames(input);
  const address = input.slug === undefined ? '' : `: ${input.slug}.${input.rootDomain}`;
  const sample = `https://${SAMPLE_SLUG}.${input.rootDomain}/${SAMPLE_GUEST}`;
  return [
    `Namaste ${first} ji & ${second} ji 🙏`,
    `Vivah team se likh rahe hain. Aapne apni shaadi ka invite banaya tha${address} 💛`,
    'Agar invitation ka sab final ho chuka hai, toh bas "done" likh dijiye, hum aur message nahi karenge 🙏 Ek line mein kyun bata dein toh bahut help hogi.',
    'Aur agar abhi soch rahe hain: shaadi ke invites kab tak bhejne ka plan hai? 😊',
    'Hum bechne nahi, help karne ke liye hain. Address, gaana, functions ya payment, kuch bhi atka ho toh yahin reply kijiye, 2 minute mein theek kar denge.',
    `Website: https://${input.rootDomain}`,
    `Ek baar ye sample invite dekhiye, aapka bhi bilkul aisa hi banega 👇\n${sample}`,
    'Team Vivah 💛',
  ].join('\n\n');
}
