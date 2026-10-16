import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { env } from '@/lib/env';
import { THEME_COLOR } from '@/lib/pwa';
import { BRAND_DESCRIPTION, SHARE_IMAGE, siteOrigin } from '@/lib/seo';

export const metadata: Metadata = {
  // The public origin, so canonical and Open Graph URLs name vivah.online and
  // never the Cloud Run address. See `siteOrigin` in lib/seo.ts.
  metadataBase: new URL(siteOrigin(env.rootDomain, env.appUrl)),
  title: {
    default: env.appName,
    template: `%s | ${env.appName}`,
  },
  description: BRAND_DESCRIPTION,
  openGraph: { siteName: env.appName, type: 'website', images: [SHARE_IMAGE] },
  twitter: { card: 'summary_large_image', images: [SHARE_IMAGE.url] },
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
  // Lets the page draw under a phone's notch and home indicator, so fixed chrome can
  // pad itself with env(safe-area-inset-bottom), as the WhatsApp button does.
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
 *   preloaded, and its `unicode-range` names only the Devanagari blocks.
 *   Without the range, one ₹ on a page (Huninn has no ₹) downloads 125 KB of
 *   Devanagari fonts on a phone. The ₹ comes from the system font instead.
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
  // The Devanagari block, Vedic extensions, the joiners, the dotted circle
  // and Devanagari Extended: the range Google Fonts serves this subset with.
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+25CC, U+A830-A839, U+A8E0-A8FF',
    },
  ],
});

/**
 * The Shubh Vivah invite faces (SIL OFL), as on a printed card: Dancing Script
 * for the couple's names and Arvo, a slab serif, for everything else. Tiro
 * Devanagari Sanskrit sets the Ganesh shloka; its `unicode-range` names only
 * the Devanagari blocks, so a page without Devanagari never downloads it.
 * Only `[data-theme='shubh-vivah']` uses them, so none is preloaded on the
 * product site.
 */
const arvo = localFont({
  src: [
    { path: '../public/fonts/arvo-400.woff2', weight: '400' },
    { path: '../public/fonts/arvo-400-italic.woff2', weight: '400', style: 'italic' },
    { path: '../public/fonts/arvo-700.woff2', weight: '700' },
  ],
  variable: '--font-arvo',
  display: 'swap',
  preload: false,
});

const dancingScript = localFont({
  src: '../public/fonts/dancingscript-700.woff2',
  weight: '700',
  variable: '--font-dancing-script',
  display: 'swap',
  preload: false,
});

const tiroDevanagari = localFont({
  src: '../public/fonts/tirodevanagarisanskrit-400-italic.woff2',
  weight: '400',
  style: 'italic',
  variable: '--font-tiro-devanagari',
  display: 'swap',
  preload: false,
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+25CC, U+A830-A839, U+A8E0-A8FF',
    },
  ],
});

/**
 * The jewel invite's faces (SIL OFL), from the product owner's design spec:
 * Playfair Display 600 for the couple's names (and 400 italic for the "&"),
 * DM Serif Display 400 and italic for everything else, and Martel for the
 * Devanagari shloka. Only the invite uses them, so none is preloaded.
 * Martel is the Devanagari subset only, with its `unicode-range`.
 */
const playfair = localFont({
  src: [
    { path: '../public/fonts/playfairdisplay-600.woff2', weight: '600' },
    { path: '../public/fonts/playfairdisplay-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
});

const dmSerif = localFont({
  src: [
    { path: '../public/fonts/dmserifdisplay-400.woff2', weight: '400' },
    { path: '../public/fonts/dmserifdisplay-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-dm-serif',
  display: 'swap',
  preload: false,
});

const martel = localFont({
  src: '../public/fonts/martel-400-devanagari.woff2',
  weight: '400',
  variable: '--font-martel',
  display: 'swap',
  preload: false,
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+25CC, U+A830-A839, U+A8E0-A8FF',
    },
  ],
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
 *   - `app/(main)/layout.tsx` — the product site. `SiteHeader` on every
 *     screen (a hamburger menu on a phone), and the `Footer`.
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
      className={`${huninn.variable} ${baloo.variable} ${balooDevanagari.variable} ${arvo.variable} ${dancingScript.variable} ${tiroDevanagari.variable} ${playfair.variable} ${dmSerif.variable} ${martel.variable}`}
      suppressHydrationWarning
    >
      {/* The flex column lets a short page push its footer to the bottom of the screen. */}
      <body className="flex min-h-dvh flex-col antialiased">{children}</body>
    </html>
  );
}
