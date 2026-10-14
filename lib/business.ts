/**
 * The business behind vivah.online: how customers reach us, and the facts the
 * policy pages and the footer print. Pure data and URL builders, no I/O.
 *
 * The legal pages read every fact from here, so a change (a registered
 * address, a GSTIN) is one edit. `address` stays empty until Sandeep sends the
 * address to publish; the pages hide the line while it is empty.
 */

export const BUSINESS = {
  brand: 'vivah.online',
  /** The person who runs the business, as a sole proprietor. */
  owner: 'Sandeep',
  /** The postal address the consumer rules ask for. Empty until confirmed. */
  address: '',
  /** WhatsApp and phone support, E.164. */
  whatsAppE164: '+919546342507',
  email: 'support@vivah.online',
  /** When a support message gets an answer. */
  hours: '9 am to 9 pm IST, every day',
  /** The date the policy pages last changed, `YYYY-MM-DD`. */
  policiesUpdated: '2026-10-14',
} as const;

/**
 * The price of the basic plan, in rupees, one time. From the PRD's pricing
 * (₹499 basic, ₹799 with more events). The home page prints it.
 */
export const PRICE_FROM_RUPEES = 499;

/** The first message the floating WhatsApp button types for the visitor. */
export const WHATSAPP_HELLO = 'Hi';

/**
 * A WhatsApp chat link to a number, with a message typed in:
 * `https://wa.me/919546342507?text=Hi`. The number goes without the plus.
 */
export function whatsAppChatUrl(phoneE164: string, text: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  if (digits.length < 8) throw new Error(`Not a phone number: "${phoneE164}"`);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
