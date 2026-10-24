/**
 * Search and AI-crawler rules for the product site: the canonical origin, the
 * pages in the sitemap, the robots rules per host, and the JSON-LD shapes the
 * marketing pages print. Pure, so it is tested without a request.
 *
 * The keyword plan lives in the PRD's "SEO plan" tab. Each marketing page
 * answers one cluster of searches, so two pages never compete for one search.
 */

import type { MetadataRoute } from 'next';

import { PRICE_FROM_RUPEES, SOCIAL } from '@/lib/business';
import { normaliseHost, resolveSiteSurface } from '@/lib/site-host';

/** The date the marketing copy last changed. Shown on the page and in `dateModified`. */
export const CONTENT_UPDATED = '2026-10-16';

/** The brand line used in titles, schema and `llms.txt`. Keep them identical. */
export const BRAND_DESCRIPTION =
  'Hindu wedding invitation websites for India, with a couple dashboard to make a named invite link for each guest and send it on WhatsApp.';

/**
 * What the product includes, in plain sentences, for `featureList` in the
 * schema and the "What is included" part of `public/llms.txt`.
 *
 * AI answer engines summarise the product from these words. One once said the
 * site "only offers WhatsApp RSVP" and has no dashboard, because the dashboard
 * was named nowhere a crawler reads. So every built feature is named here, and
 * the RSVP line says exactly what it does. List only what is built: an answer
 * engine repeats an overclaim to couples as a promise.
 */
export const PRODUCT_FEATURES: readonly string[] = [
  'A wedding website on its own address, such as raadha-shyam.vivah.online',
  'A private preview on WhatsApp before you pay',
  'A couple dashboard ("My site"), signed in with your phone number',
  'Edit the names, date, time, venue and Google Maps link from the dashboard; every link updates',
  'Change the invite’s song from the dashboard',
  'Make a personal invite link for each guest by typing their name in the dashboard',
  'Copy each guest link, or send it on WhatsApp in one tap, from the dashboard',
  'Delete a guest link from the dashboard',
  'Each guest’s invite opens with a Shri Ganesh card that greets them by name (“Hi Neha”) and waits for their tap',
  'A link preview card in WhatsApp with the guest’s name, the couple’s names and the date',
  'The Vakratunda shloka and Shri Ganesh over the couple’s names',
  'The wedding date hidden under gold foil cards that guests scratch to reveal',
  'A live countdown to the wedding, and a blessing for the couple after the day',
  'Add the wedding to Google Calendar in one tap',
  'The venue with a Google Maps link',
  'A song for the invite, chosen at sign-up: it starts when the guest taps to open the invite, never by itself, and a speaker button pauses it',
  'RSVP on WhatsApp: guests reply to the couple in one tap, and the reply arrives in the couple’s WhatsApp',
  'No app to install for the couple or the guests; no charge per guest',
];

/**
 * The questions `/help` answers, with `FAQPage` schema. They name the
 * dashboard and the RSVP plainly, so an answer engine does not guess.
 */
export const PRODUCT_FAQS: readonly Faq[] = [
  {
    question: 'What do I get with vivah.online?',
    answer:
      'A wedding website on your own address, a dashboard to manage it, and a personal invite link for every guest. Each invite opens with Shri Ganesh and the guest’s name, then shows your song, a date to scratch open, a countdown, the venue map and a WhatsApp RSVP button.',
  },
  {
    question: 'Is there a dashboard for the couple?',
    answer:
      'Yes. After you pay, sign in with your phone number at vivah.online/dashboard ("My site"). There you change your wedding details and your song, make an invite link for each guest by name, copy it or send it on WhatsApp, and delete links you no longer need.',
  },
  {
    question: 'What do guests see when they open the link?',
    answer:
      'A Shri Ganesh card says “Hi” with the guest’s name and asks them to tap. The tap opens your invite and starts your song, which they can pause. They scratch gold foil to reveal the date, then see the countdown, the venue on Google Maps and the RSVP button.',
  },
  {
    question: 'How does RSVP work?',
    answer:
      'Each invite has an RSVP button. The guest taps it, and WhatsApp opens with a reply to you already typed. The reply comes to your WhatsApp, so you read every answer in your chats.',
  },
  {
    question: 'Can I change the details after I send the invite?',
    answer:
      'Yes. Change the date, time, venue or map link in your dashboard. Every guest link shows the new details at once, so you send nothing again.',
  },
  {
    question: 'How much does it cost?',
    answer: `From ₹${PRICE_FROM_RUPEES}, paid once. There is no charge per guest, and you see a free preview before you pay.`,
  },
  {
    question: 'Why doesn’t my invite link show a picture on WhatsApp?',
    answer:
      'WhatsApp has a setting called “Disable link previews”, on Android and on iPhone. When it is on, every link shows as plain text with no picture. The link still works, and your guest sees the full invite when they tap it. On Android, tap ⋮ > Settings > Privacy > Advanced. On iPhone, tap Settings or your profile picture, then Privacy > Advanced. Turn off “Disable link previews”, then send the link again.',
    link: {
      href: 'https://faq.whatsapp.com/445453537819972/',
      label: 'WhatsApp Help: turn link previews on or off',
    },
  },
];

/**
 * The link preview for the product site: the logo and the brand line, from the
 * brand kit (docs/brand.md). A page that sets its own `openGraph` replaces the
 * layout's, so it must list this image again. A couple's invite uses its own.
 */
export const SHARE_IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'vivah.online: your wedding website, with a personal invite for every guest',
} as const;

/**
 * The public origin of the product site: `https://vivah.online`.
 *
 * The root domain wins over `NEXT_PUBLIC_APP_URL`, because the app URL can be
 * left at its localhost fallback or point at the `*.run.app` address, and a
 * canonical URL there sends search engines to the wrong host.
 */
export function siteOrigin(rootDomain: string, appUrl: string): string {
  const root = normaliseHost(rootDomain);
  return root === '' ? appUrl.replace(/\/$/, '') : `https://${root}`;
}

export interface MarketingPage {
  path: string;
  /** How often the page changes, for the sitemap. */
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

/**
 * Every page that search engines and AI answer engines should find. Nothing
 * behind a login, no preview, no couple's invite: those carry guests' names.
 */
export const MARKETING_PAGES: readonly MarketingPage[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/whatsapp-wedding-invitation', changeFrequency: 'monthly', priority: 0.9 },
  {
    path: '/guides/wedding-invitation-message-whatsapp',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/guides/reply-to-wedding-invitation-on-whatsapp',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  { path: '/about', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/help', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/refund-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/delivery-policy', changeFrequency: 'yearly', priority: 0.3 },
];

export function sitemapEntries(origin: string): MetadataRoute.Sitemap {
  const lastModified = new Date(`${CONTENT_UPDATED}T00:00:00Z`);
  return MARKETING_PAGES.map((page) => ({
    url: page.path === '/' ? origin : `${origin}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

/** Paths on the product site that no crawler needs. Each also sends `noindex`. */
const PRIVATE_PATHS = [
  '/api/',
  '/preview/',
  '/site/',
  '/dashboard',
  '/profile',
  '/sign-in',
  '/design',
];

/**
 * Link-preview fetchers. A couple's invite blocks every crawler, except these:
 * without them, WhatsApp and Facebook show a bare link instead of the card.
 */
const LINK_PREVIEW_AGENTS = ['WhatsApp', 'facebookexternalhit', 'Facebot'];

/**
 * True when a request comes from a link-preview fetcher, not a person. The
 * WhatsApp app sends `WhatsApp/2.x` while it builds a preview on the sender's
 * phone; Facebook's crawler sends `facebookexternalhit` or `Facebot`.
 */
export function isLinkPreviewAgent(userAgent: string | null): boolean {
  if (userAgent === null) return false;
  const agent = userAgent.toLowerCase();
  return LINK_PREVIEW_AGENTS.some((name) => agent.includes(name.toLowerCase()));
}

/**
 * The robots rules for a request's host.
 *
 * - The product site lets every search and AI crawler read the marketing
 *   pages, and points them at the sitemap.
 * - A couple's invite (`raadha-shyam.vivah.online`) is private: guests' names
 *   are in its paths. Only link-preview fetchers may read it.
 */
export function robotsFor(host: string, rootDomain: string, origin: string): MetadataRoute.Robots {
  if (resolveSiteSurface(host, rootDomain).kind === 'invite') {
    return {
      rules: [
        { userAgent: LINK_PREVIEW_AGENTS, allow: '/' },
        { userAgent: '*', disallow: '/' },
      ],
    };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE_PATHS }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}

export interface Faq {
  question: string;
  answer: string;
  /** A page that says more, shown under the answer. */
  link?: { href: string; label: string };
}

/** schema.org `FAQPage`. The questions and answers must also show on the page. */
export function faqPageSchema(faqs: readonly Faq[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.link === undefined ? faq.answer : `${faq.answer} ${faq.link.href}`,
      },
    })),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/** schema.org `BreadcrumbList`, from the home page down to this page. */
export function breadcrumbSchema(
  origin: string,
  crumbs: readonly Crumb[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.path === '/' ? origin : `${origin}${crumb.path}`,
    })),
  };
}

export interface ArticleInput {
  origin: string;
  path: string;
  headline: string;
  description: string;
  brand: string;
}

/** schema.org `Article` for a guide, with the dates the page shows. */
export function articleSchema(input: ArticleInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: `${input.origin}${input.path}`,
    datePublished: CONTENT_UPDATED,
    dateModified: CONTENT_UPDATED,
    inLanguage: 'en-IN',
    author: { '@type': 'Organization', name: input.brand, url: input.origin },
    publisher: { '@type': 'Organization', name: input.brand, url: input.origin },
  };
}

/** schema.org `Organization` and `WebSite` for the home page. */
export function organizationSchema(origin: string, brand: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: brand,
        url: origin,
        logo: `${origin}/icons/icon-512.png`,
        description: BRAND_DESCRIPTION,
        areaServed: 'IN',
        sameAs: [SOCIAL.instagram.url, SOCIAL.facebook.url],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: brand,
        url: origin,
        inLanguage: 'en-IN',
        publisher: { '@id': `${origin}/#organization` },
      },
    ],
  };
}

/**
 * schema.org `WebApplication` for the home page: what the product is, what it
 * includes (`featureList`) and its starting price.
 */
export function webApplicationSchema(origin: string, brand: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${origin}/#app`,
    name: brand,
    url: origin,
    description: BRAND_DESCRIPTION,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any, in a web browser',
    inLanguage: 'en-IN',
    featureList: PRODUCT_FEATURES,
    offers: {
      '@type': 'Offer',
      price: PRICE_FROM_RUPEES,
      priceCurrency: 'INR',
      url: origin,
    },
    publisher: { '@id': `${origin}/#organization` },
  };
}

/**
 * A WhatsApp link that opens the app with `text` typed, so the visitor picks a
 * chat and sends it. No phone number: `wa.me/?text=` asks whom to send to.
 */
export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** `14 October 2026`, for the visible "Last updated" line. */
export function formatUpdated(isoDate: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
