# Domain routing

One Cloud Run service serves the product site and every couple's invite. This page explains how a request for `raadha-shyam.vivah.online` reaches the right page.

## The path of a request

```
Visitor ─► Cloudflare (DNS + certificate) ─► Worker vivah-router ─► Cloud Run ─► proxy.ts ─► page
```

1. **DNS.** The `vivah.online` zone is on Cloudflare. Two proxied records point at a placeholder: `AAAA * 100::` and `AAAA @ 100::`. The Worker answers before traffic reaches the placeholder.
2. **Certificate.** Cloudflare's free Universal SSL covers `vivah.online` and `*.vivah.online`. It covers one level only, so a couple slug never contains a dot.
3. **Worker.** The routes `*.vivah.online/*` and `vivah.online/*` run the Worker `vivah-router`. It forwards the request to the `*.run.app` URL and puts the visitor's host in `X-Forwarded-Host`. It redirects `www` to the root.
4. **Cloud Run.** The service allows unauthenticated invocations, with ingress set to All.
5. **`proxy.ts`.** It reads `X-Forwarded-Host` and calls `resolveSiteSurface` in `lib/site-host.ts`:
   - `vivah.online` shows the product site.
   - `<slug>.vivah.online` is rewritten to `/site/<slug>`, which renders that couple's invite.
   - `<slug>.vivah.online/<guest>` is rewritten to `/site/<slug>/<guest>`, the same invite with a greeting for that guest.
6. **Route groups.** Invite pages live in `app/(invite)`, which has no product header. Product pages live in `app/(main)`.

Why a Worker: Cloud Run domain mapping and Firebase Hosting do not support wildcard domains. A Google Cloud load balancer does, but it costs a fixed monthly fee. The Worker free tier allows 100,000 requests per day.

## Configuration

| Where      | Setting                                            |
| ---------- | -------------------------------------------------- |
| Cloud Run  | `ROOT_DOMAIN=vivah.online` (set by `deploy.yml`)   |
| Cloudflare | SSL/TLS mode Full (strict), Always Use HTTPS on    |
| Cloudflare | Worker routes `*.vivah.online/*`, `vivah.online/*` |
| Cloudflare | Failure mode: Fail closed                          |

An empty `ROOT_DOMAIN` turns invite routing off. Then every host shows the product site.

## The Worker

Paste this into the Worker editor. Change `ORIGIN` when the Cloud Run URL changes.

```js
const ORIGIN = 'https://vivah-1081921075866.asia-south1.run.app';
const APEX = 'vivah.online';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;
    if (host === `www.${APEX}`) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }
    // Join the strings first. A path that starts with "//" names a host, so
    // new URL(path, ORIGIN) would fetch that other host instead of Cloud Run.
    const target = new URL(ORIGIN + url.pathname + url.search);
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', host);
    headers.set('X-Forwarded-Proto', 'https');
    if (env.ROUTER_SECRET) headers.set('X-Router-Secret', env.ROUTER_SECRET);
    const res = await fetch(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    });
    // A redirect to the run.app address goes back to the visitor's host.
    const loc = res.headers.get('Location');
    if (loc && loc.startsWith(ORIGIN)) {
      const out = new Response(res.body, res);
      out.headers.set('Location', loc.replace(ORIGIN, `https://${host}`));
      return out;
    }
    return res;
  },
};
```

Build `target` from one joined string, as shown. Do not pass `ORIGIN` as the base argument to `new URL`. A request path such as `//example.com/x` is a host-relative URL, so the Worker would fetch `example.com`. The deployed Worker had this fault until 19 October 2026.

The app does not check `X-Router-Secret` yet. Until it does, the `*.run.app` URL also serves the app directly.

## Short links

`vivah.online/ig` is the link in the Instagram bio. Instagram shows the bio link as plain text, so the tagged address is kept out of sight. `app/ig/route.ts` answers a 307 to `/?utm_source=instagram&utm_medium=organic&utm_campaign=bio`. The Location is relative, so the browser stays on the visitor's host. `/admin` > Visitors counts the visit under Instagram, campaign `bio`.

## Test it locally

1. Set `ROOT_DOMAIN=localhost.test` in `.env.local`.
2. Add `127.0.0.1 raadha-shyam.localhost.test` to `/etc/hosts`.
3. Run `pnpm dev`, then open `http://raadha-shyam.localhost.test:3000`.

A wedding must exist with that slug, or the page shows "No invite at this address".
