/**
 * The business behind vivah.online: how customers reach us, and the facts the
 * policy pages and the footer print. Pure data and URL builders, no I/O.
 *
 * The legal pages read every fact from here, so a change (a registered
 * address, a GSTIN) is one edit. `address` stays empty until an address is
 * confirmed for publishing; the pages hide the line while it is empty.
 *
 * The pages name no person. They speak as the team, so a change of people
 * changes nothing here.
 */

export const BUSINESS = {
  brand: 'vivah.online',
  /** The postal address the consumer rules ask for. Empty until confirmed. */
  address: '',
  /** WhatsApp and phone support, E.164. */
  whatsAppE164: '+919546342507',
  /** Help with an invite, a payment or a complaint. */
  email: 'support@vivah.online',
  /** Everything else: questions before you start, partnerships, press. */
  helloEmail: 'hello@vivah.online',
  /** Who answers, in one line. Printed with the support contacts. */
  promise:
    'We are a small team. A real person reads every message, and we fix your issue as soon as we can.',
  /** When a support message gets an answer. */
  hours: '9 am to 9 pm IST, every day',
  /** What we sell, in one line. The footer prints it for the payment provider. */
  natureOfService: 'Digital invitation service. No physical products are shipped.',
  /** The date the policy pages last changed, `YYYY-MM-DD`. */
  policiesUpdated: '2026-10-25',
} as const;

/**
 * Our public social profiles. The footer links them, and the home page's
 * `Organization` schema lists them as `sameAs`, so search engines join them
 * to the site.
 */
export const SOCIAL = {
  instagram: { url: 'https://www.instagram.com/vivah.online/', handle: '@vivah.online' },
  facebook: { url: 'https://www.facebook.com/profile.php?id=61595459818394' },
} as const;

/**
 * The list price, in rupees, one time. The home page prints it, and the pay
 * button charges it less any coupon the couple applies (`lib/coupons.ts`).
 * The product owner raised it from ₹499 to ₹799 on 2026-10-24, with coupon
 * codes, so a couple sees a discount when they ask for one. ADR-0015.
 */
export const PRICE_FROM_RUPEES = 799;

/**
 * What paper cards cost and how long they take, as the home page's "paper or
 * digital" table and the publish banner print it. A typical range for a
 * printed set with a box, posted to every guest; not a quote.
 */
export const PAPER_CARDS = {
  cost: '₹5,000 to ₹50,000+',
  /** The low end alone, for the publish banner's short price card. */
  costFrom: '₹5,000+',
  readyIn: '2 to 4 weeks',
} as const;

/** How the banner names each payment provider. `env.paymentProvider` picks one. ADR-0012. */
export const PAYMENT_PROVIDER_NAMES = { cashfree: 'Cashfree', razorpay: 'Razorpay' } as const;

/** The ways to pay, in the order Indian buyers look for them. Text only, no brand logos. */
export const PAYMENT_METHODS = ['UPI', 'Visa', 'Mastercard', 'RuPay', 'Net banking'] as const;

/**
 * A WhatsApp chat link to a number, with a message typed in:
 * `https://wa.me/919546342507?text=Hi`. The number goes without the plus.
 */
export function whatsAppChatUrl(phoneE164: string, text: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  if (digits.length < 8) throw new Error(`Not a phone number: "${phoneE164}"`);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/**
 * A WhatsApp share link with no number: `https://wa.me/?text=…`. On a phone
 * it opens WhatsApp's contact picker with the message typed in. WhatsApp
 * draws the link preview from the first URL in the text.
 */
export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
