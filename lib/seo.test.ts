import { describe, expect, it } from 'vitest';

import {
  articleSchema,
  breadcrumbSchema,
  faqPageSchema,
  formatUpdated,
  isLinkPreviewAgent,
  MARKETING_PAGES,
  organizationSchema,
  PRODUCT_FAQS,
  PRODUCT_FEATURES,
  robotsFor,
  sitemapEntries,
  siteOrigin,
  webApplicationSchema,
  whatsAppShareUrl,
} from '@/lib/seo';

const ROOT = 'vivah.online';
const ORIGIN = 'https://vivah.online';

describe('siteOrigin', () => {
  it('prefers the root domain over the app URL', () => {
    expect(siteOrigin(ROOT, 'http://localhost:3000')).toBe(ORIGIN);
  });

  it('falls back to the app URL when host routing is off', () => {
    expect(siteOrigin('', 'http://localhost:3000/')).toBe('http://localhost:3000');
  });
});

describe('sitemapEntries', () => {
  it('lists every marketing page under the origin, and nothing private', () => {
    const urls = sitemapEntries(ORIGIN).map((entry) => entry.url);
    expect(urls).toHaveLength(MARKETING_PAGES.length);
    expect(urls[0]).toBe(ORIGIN);
    expect(urls).toContain(`${ORIGIN}/whatsapp-wedding-invitation`);
    expect(urls.some((url) => /\/(preview|site|profile|api)\b/.test(url))).toBe(false);
  });
});

describe('robotsFor', () => {
  it('lets crawlers read the product site and points at the sitemap', () => {
    const robots = robotsFor('vivah.online', ROOT, ORIGIN);
    expect(robots.sitemap).toBe(`${ORIGIN}/sitemap.xml`);
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    expect(rules[0]).toMatchObject({ userAgent: '*', allow: '/' });
    expect(rules[0]?.disallow).toContain('/preview/');
  });

  it('closes a couple’s invite to crawlers but keeps the WhatsApp preview', () => {
    const robots = robotsFor('raadha-shyam.vivah.online', ROOT, ORIGIN);
    expect(robots.sitemap).toBeUndefined();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    expect(rules).toContainEqual({ userAgent: '*', disallow: '/' });
    expect(rules[0]?.userAgent).toContain('WhatsApp');
    expect(rules[0]?.allow).toBe('/');
  });

  it('treats every host as the product site when routing is off', () => {
    expect(robotsFor('localhost:3000', '', 'http://localhost:3000').sitemap).toBe(
      'http://localhost:3000/sitemap.xml',
    );
  });
});

describe('schema', () => {
  it('builds an FAQPage from questions and answers', () => {
    expect(faqPageSchema([{ question: 'Q?', answer: 'A.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } },
      ],
    });
  });

  it('numbers breadcrumbs from the home page', () => {
    const list = breadcrumbSchema(ORIGIN, [
      { name: 'Home', path: '/' },
      { name: 'Guide', path: '/guides/x' },
    ]);
    expect(list.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN },
      { '@type': 'ListItem', position: 2, name: 'Guide', item: `${ORIGIN}/guides/x` },
    ]);
  });

  it('dates an article with the visible last-updated date', () => {
    const article = articleSchema({
      origin: ORIGIN,
      path: '/guides/x',
      headline: 'H',
      description: 'D',
      brand: 'Vivah',
    });
    expect(article.dateModified).toBe(article.datePublished);
    expect(article.mainEntityOfPage).toBe(`${ORIGIN}/guides/x`);
  });

  it('joins the organisation to its Instagram and Facebook profiles', () => {
    const graph = organizationSchema(ORIGIN, 'vivah.online')['@graph'] as Record<string, unknown>[];
    expect(graph[0]?.sameAs).toEqual([
      'https://www.instagram.com/vivah.online/',
      'https://www.facebook.com/profile.php?id=61595459818394',
    ]);
  });

  it('lists the dashboard and the WhatsApp RSVP in the app’s features', () => {
    const app = webApplicationSchema(ORIGIN, 'vivah.online');
    expect(app['@type']).toBe('WebApplication');
    expect(app.featureList).toBe(PRODUCT_FEATURES);
    expect(PRODUCT_FEATURES.some((feature) => feature.includes('dashboard'))).toBe(true);
    expect(PRODUCT_FEATURES.some((feature) => feature.startsWith('RSVP on WhatsApp'))).toBe(true);
    expect(app.offers).toMatchObject({ priceCurrency: 'INR', price: 799 });
  });

  it('answers the dashboard and RSVP questions on the help page', () => {
    const questions = PRODUCT_FAQS.map((faq) => faq.question);
    expect(questions).toContain('Is there a dashboard for the couple?');
    expect(questions).toContain('How does RSVP work?');
  });
});

describe('whatsAppShareUrl', () => {
  it('opens WhatsApp with the text typed and no number', () => {
    expect(whatsAppShareUrl('Hi ji & all\nसब')).toBe(
      'https://wa.me/?text=Hi%20ji%20%26%20all%0A%E0%A4%B8%E0%A4%AC',
    );
  });
});

describe('formatUpdated', () => {
  it('writes the date as people in India read it', () => {
    expect(formatUpdated('2026-10-14')).toBe('14 October 2026');
  });
});

describe('isLinkPreviewAgent', () => {
  it('knows the WhatsApp app and Facebook crawler', () => {
    expect(isLinkPreviewAgent('WhatsApp/2.23.20.0 A')).toBe(true);
    expect(isLinkPreviewAgent('facebookexternalhit/1.1')).toBe(true);
  });

  it('treats a phone browser as a person', () => {
    expect(
      isLinkPreviewAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129 Mobile'),
    ).toBe(false);
    expect(isLinkPreviewAgent(null)).toBe(false);
  });
});
