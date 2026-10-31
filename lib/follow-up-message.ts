/**
 * The follow-up message for a couple who made a preview and has not paid.
 * Pure, so it is tested alone.
 *
 * A couple who just made a preview is still thinking about it. A message from
 * a person either helps them pay or tells us why they did not (Sandeep,
 * 2026-10-29). The admin decides when to send it, by hand from the WhatsApp
 * Business app. The daily nudges in `lib/preview-nudges.ts` are separate.
 */

import { coupleNames, type NameOrder } from '@/lib/couple-names';

export interface FollowUpInput {
  bride: string;
  groom: string;
  /** Whose name comes first in the greeting. Absent: the bride's. */
  nameOrder?: NameOrder | undefined;
  /** The preview link, `https://vivah.online/p/<id>`. */
  link: string;
}

/**
 * The message. It asks how the invite looked, offers help with the usual
 * blockers, asks for one line of feedback if they will not buy, and says it is
 * fine to take more time and write on this chat whenever they like. The link
 * goes before the sign-off, as in the daily nudges.
 */
export function followUpMessage(input: FollowUpInput): string {
  return [
    `Namaste ${coupleNames(input)} 🙏`,
    'Aapne apna wedding invite dekha? Kaisa laga? 😊',
    'Kuch badalna hai, ya price, payment ya details ke baare mein koi sawaal hai? Bas yahin reply kijiye, hum abhi help karenge 💛',
    'Abhi nahi lena? Koi baat nahi 🙏 Bas ek line mein bata dijiye kyun. Isse hum Vivah ko aur behtar bana payenge.',
    'Aur sochne ke liye aur time chahiye, toh bilkul theek hai 😊 Jab bhi mann ho, isi chat pe message kijiye. Hum aapki help ke liye hamesha yahin hain 💛',
    `Aapka invite yahan hai. Link band ho gaya ho toh reply kijiye, hum dobara khol denge 👇\n${input.link}`,
    'Team Vivah 💛',
  ].join('\n\n');
}
