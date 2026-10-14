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
 * The Phera typefaces, self-hosted from public/fonts. Self-hosting means the
 * build never calls a font CDN, so the Docker build works offline. See
 * .github/instructions/design-language.md, "Type".
 *
 * - Huninn (SIL OFL) is the voice: every heading, label and line of body text.
 *   It has one weight, 400.
 * - Baloo 2 (SIL OFL) carries the weights 500-800 for numbers and badges.
 * - Baloo 2 Devanagari covers Hindi and Sanskrit text. Huninn has no
 *   Devanagari glyphs, so the browser falls through to it. It is not
 *   preloaded: it downloads only on a page that shows Devanagari.
 */
const huninn = localFont({
  src: '../public/fonts/huninn-400.woff2',
  weight: '400',
  variable: '--font-huninn',
  display: 'swap',
});

const baloo = localFont({
  src: [
    { path: '../public/fonts/baloo2-400.woff2', weight: '400' },
    { path: '../public/fonts/baloo2-500.woff2', weight: '500' },
    { path: '../public/fonts/baloo2-600.woff2', weight: '600' },
    { path: '../public/fonts/baloo2-700.woff2', weight: '700' },
    { path: '../public/fonts/baloo2-800.woff2', weight: '800' },
  ],
  variable: '--font-baloo',
  display: 'swap',
  preload: false,
});

const balooDevanagari = localFont({
  src: [
    { path: '../public/fonts/baloo2-devanagari-400.woff2', weight: '400' },
    { path: '../public/fonts/baloo2-devanagari-600.woff2', weight: '600' },
    { path: '../public/fonts/baloo2-devanagari-700.woff2', weight: '700' },
    { path: '../public/fonts/baloo2-devanagari-800.woff2', weight: '800' },
  ],
  variable: '--font-baloo-devanagari',
  display: 'swap',
  preload: false,
});

/**
 * The product theme. 'phera' is the default token set; 'calm' and 'night'
 * re-assign tokens in styles/globals.css. Set once per product, here only.
 */
const THEME: 'phera' | 'calm' | 'night' = 'phera';

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
      className={`${huninn.variable} ${baloo.variable} ${balooDevanagari.variable}`}
      suppressHydrationWarning
    >
      {/* The flex column lets a short page push its footer to the bottom of the screen. */}
      <body className="flex min-h-dvh flex-col antialiased">{children}</body>
    </html>
  );
}
