import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { env } from '@/lib/env';
import { THEME_COLOR } from '@/lib/pwa';
import { BRAND_DESCRIPTION, siteOrigin } from '@/lib/seo';

export const metadata: Metadata = {
  // The public origin, so canonical and Open Graph URLs name vivah.online and
  // never the Cloud Run address. See `siteOrigin` in lib/seo.ts.
  metadataBase: new URL(siteOrigin(env.rootDomain, env.appUrl)),
  title: {
    default: env.appName,
    template: `%s | ${env.appName}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: env.appName,
  // iOS reads these, not the manifest, when the user adds the app to the home
  // screen. The manifest in app/manifest.ts serves every other browser.
  appleWebApp: { capable: true, title: env.appName, statusBarStyle: 'default' },
  robots: {
    // Deployed previews should not be indexed. Flip this on for the real site.
    index: env.isProduction,
    follow: env.isProduction,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the page draw under a phone's notch and home indicator, so TabBar can
  // pad itself with env(safe-area-inset-bottom) like a native nav bar.
  viewportFit: 'cover',
  // Matches --color-paper for the active theme. See lib/pwa.ts.
  themeColor: THEME_COLOR,
};

/**
 * The typefaces, self-hosted from public/fonts (Latin subsets, OFL). Self-hosting
 * means the build never calls Google Fonts, so the Docker build works offline.
 * See .github/instructions/design-language.md, "Type".
 *
 * Cormorant Garamond sets the headings, Great Vibes the script flourishes and
 * the couple's names, Zen Maru Gothic the body text.
 */
const cormorant = localFont({
  src: [
    { path: '../public/fonts/cormorantgaramond-500.woff2', weight: '500' },
    { path: '../public/fonts/cormorantgaramond-600.woff2', weight: '600' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
});

const greatVibes = localFont({
  src: '../public/fonts/greatvibes-400.woff2',
  weight: '400',
  variable: '--font-great-vibes',
  display: 'swap',
});

const zenMaru = localFont({
  src: [
    { path: '../public/fonts/zenmarugothic-400.woff2', weight: '400' },
    { path: '../public/fonts/zenmarugothic-500.woff2', weight: '500' },
    { path: '../public/fonts/zenmarugothic-700.woff2', weight: '700' },
  ],
  variable: '--font-zen-maru',
  display: 'swap',
});

/**
 * The product theme. 'vivah' is the default token set; 'playroom', 'calm' and
 * 'night' re-assign tokens in styles/globals.css. Set once per product, here only.
 */
const THEME: 'vivah' | 'playroom' | 'calm' | 'night' = 'vivah';

/**
 * Root layout — a Server Component, and it must stay one.
 *
 * Adding `'use client'` here would turn the entire application into a client
 * bundle. Providers that need client state belong in their own
 * `'use client'` component rendered from here as a child.
 *
 * It holds only what every surface shares: the document, the fonts and the
 * theme. The shell is per surface, in a route group:
 *
 *   - `app/(main)/layout.tsx` — the product site. `TabBar` on a phone,
 *     `SiteHeader` from `md` up, and the `Footer`.
 *   - `app/(invite)/layout.tsx` — a couple's invite and the private preview.
 *     No product navigation: a guest opening an invite sees the invite.
 *
 * The split is by route, not by `usePathname()`, because a couple's invite is
 * reached through a rewrite in `proxy.ts`, and a rewrite makes the client and
 * server paths differ.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme={THEME}
      className={`${cormorant.variable} ${greatVibes.variable} ${zenMaru.variable}`}
      suppressHydrationWarning
    >
      {/* The flex column lets a short page push its footer to the bottom of the screen. */}
      <body className="flex min-h-dvh flex-col antialiased">{children}</body>
    </html>
  );
}
