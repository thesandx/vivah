/**
 * `GET /ig` — the short link in the Instagram bio.
 *
 * Instagram shows the bio link as plain text, so a long tagged address looks
 * broken. This sends the visitor to the home page with the tags that put the
 * visit under "Instagram", campaign "bio", in /admin > Visitors.
 *
 * A relative Location, as in `/p/[id]`: behind the Cloudflare Worker,
 * `request.url` is the container's own address. A 307, not a 308, so the
 * target can change without browsers keeping the old one.
 */

const INSTAGRAM_BIO_TARGET = '/?utm_source=instagram&utm_medium=organic&utm_campaign=bio';

export function GET(): Response {
  return new Response(null, { status: 307, headers: { Location: INSTAGRAM_BIO_TARGET } });
}
