import type { NextConfig } from 'next';

/**
 * Next.js configuration.
 *
 * `output: 'standalone'` is the single most important setting in this file:
 * it makes `next build` emit `.next/standalone`, a self-contained server that
 * bundles only the `node_modules` actually reachable at runtime. The Docker
 * runtime stage copies that folder instead of the full dependency tree, which
 * is what keeps the production image small (see `Dockerfile`).
 *
 * Do not remove it without also rewriting the Dockerfile.
 */
const nextConfig: NextConfig = {
  output: 'standalone',

  // Fail the production build on type errors. This is the default; it is
  // spelled out so nobody "temporarily" flips it to unblock a deploy.
  // (Next.js 16 removed the `eslint` config key along with `next lint` —
  // linting runs as its own CI step via `pnpm lint`.)
  typescript: { ignoreBuildErrors: false },

  // Drops the `X-Powered-By: Next.js` header, which tells a scanner which
  // framework to try first and tells a user nothing.
  poweredByHeader: false,
  reactStrictMode: true,

  experimental: {
    // Puts the stylesheet in a <style> tag in the HTML instead of a <link>.
    // The CSS is ~12 KB compressed and every page needs all of it, so on a
    // slow phone network this saves the round trip that blocked the first
    // paint (PageSpeed: "Render-blocking requests", ~1.2 s on mobile).
    // The cost: each full page load carries the CSS again instead of reading
    // it from the browser cache. Client-side navigation does not repeat it.
    inlineCss: true,
  },

  // Emitted on every response. Tightened here rather than in middleware so the
  // headers apply to static assets too.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
      // No page may be framed, except the sample invite: the home page shows
      // it, live, inside a phone. `proxy.ts` sends `frame-ancestors` for the
      // sample instead, because the product site's own address is known only
      // at runtime. The slug is `SAMPLE_SLUG` in `lib/sample-invite.ts`;
      // `proxy.test.ts` checks the two agree. The sample is reached at its
      // own host, or at `/site/riya-arjun` without host routing.
      {
        source: '/:path((?!site/riya-arjun(?:/|$)).*)',
        missing: [{ type: 'header', key: 'x-forwarded-host', value: 'riya-arjun\\..*' }],
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
      },
    ];
  },
};

export default nextConfig;
