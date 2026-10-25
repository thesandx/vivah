import { BUSINESS } from '@/lib/business';
import { coupleNames, type NameOrder } from '@/lib/couple-names';
import { formatPhoneForDisplay } from '@/lib/phone';

/**
 * The WhatsApp message for a couple whose site has just gone live: the live
 * link, the dashboard sign-in and the help page. The Telegram payment notice
 * carries it, and `/admin` offers it for a preview made live by hand.
 *
 * Pure: the caller passes the site's origin.
 */
export interface WelcomeInput {
  bride: string;
  groom: string;
  /** Whose name comes first. Absent: the bride's. */
  nameOrder?: NameOrder | undefined;
  slug: string;
  /** E.164. Shown to the couple as their own sign-in number. */
  phoneE164: string;
  /** The main site's origin, such as `https://vivah.online`. */
  origin: string;
}

export function welcomeMessage(input: WelcomeInput): string {
  const { slug, phoneE164, origin } = input;
  const site = `https://${slug}.${new URL(origin).host}`;
  return [
    `Congratulations ${coupleNames(input)}! 🎉💍`,
    '',
    'Your personal wedding site is live now ✨',
    `👉 ${site}`,
    '',
    'Next, make it truly yours:',
    '📍 Add your venue, time and map',
    '💌 Create a personal invite link for every guest, with their name on it',
    '',
    `Do both at ${origin}/dashboard. Sign in with your number ${formatPhoneForDisplay(phoneE164)}.`,
    '',
    `See how to add your venue and send guest invites, step by step: ${origin}/help`,
    '',
    `Need any help? Chat with us right here on WhatsApp, or email us at ${BUSINESS.email}.`,
    '',
    'Once again, many congratulations on your wedding! Wishing you both a lifetime of love and laughter 💛🙏',
    '',
    'Team Vivah 💛',
  ].join('\n');
}
