/**
 * Search and AI-crawler rules for the product site: the canonical origin, the
 * pages in the sitemap, the robots rules per host, and the JSON-LD shapes the
 * marketing pages print. Pure, so it is tested without a request.
 *
 * The keyword plan lives in the PRD's "SEO plan" tab. Each marketing page
 * answers one cluster of searches, so two pages never compete for one search.
 */

import type { MetadataRoute } from 'next';

import { SOCIAL } from '@/lib/business';
import { normaliseHost, resolveSiteSurface } from '@/lib/site-host';

/** The date the marketing copy last changed. Shown on the page and in `dateModified`. */
export const CONTENT_UPDATED = '2026-10-14';

/** The brand line used in titles, schema and `llms.txt`. Keep them identical. */
export const BRAND_DESCRIPTION =
  'Online Hindu wedding invitation websites for India, sent on WhatsApp with each guest’s name.';

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
  '/example',
];

/**
 * Link-preview fetchers. A couple's invite blocks every crawler, except these:
 * without them, WhatsApp and Facebook show a bare link instead of the card.
 */
const LINK_PREVIEW_AGENTS = ['WhatsApp', 'facebookexternalhit', 'Facebot'];

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
}

/** schema.org `FAQPage`. The questions and answers must also show on the page. */
export function faqPageSchema(faqs: readonly Faq[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
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
