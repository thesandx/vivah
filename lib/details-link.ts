/**
 * The `#details` link: ads and the Instagram and Facebook bios end in it.
 * The sign-up form has a light page of its own at `/details`, and a
 * `#details` link goes there at once, before the home page loads.
 *
 * The hash never reaches the server, so the move happens in the browser: a
 * small inline script in the root layout's `<head>` (`detailsRedirectScript`)
 * runs before the home page draws, and `SignupDialogProvider` does the same
 * after hydration, as a safety net.
 *
 * A link tool can add text after the hash. Meta puts its "URL parameters"
 * at the very end of the link, so `?utm_source=x#details` can arrive as
 * `#details?utm_source=x`, and a share can add `&fbclid=…`. Those tags move
 * into the query string, because the visit report reads it. Pure, so it is
 * tested without a browser.
 */

export const DETAILS_HASH = '#details';

/** The form's own page. */
export const DETAILS_PATH = '/details';

/**
 * The `sessionStorage` key for the referrer of the `#details` link. A move by
 * script makes the home page the referrer, so the script keeps the real one
 * here, and the visit report reads it once (`VisitTracker`).
 */
export const LANDING_REFERRER_KEY = 'vivah_landing_referrer';

/** True when this hash asks for the full-screen form, with or without text after it. */
export function isDetailsHash(hash: string): boolean {
  return hash === DETAILS_HASH || /^#details[?&/]/.test(hash);
}

/**
 * The address of the form page for a `#details` link: the query string, plus
 * any parameters from the hash. A parameter already in the query string keeps
 * its value. Returns `null` when the hash does not ask for the form.
 */
export function detailsPageUrl(search: string, hash: string): string | null {
  if (!isDetailsHash(hash)) return null;
  const params = new URLSearchParams(search);
  const extra = new URLSearchParams(hash.slice(DETAILS_HASH.length + 1));
  for (const [key, value] of extra) {
    if (!params.has(key)) params.append(key, value);
  }
  const query = params.toString();
  return `${DETAILS_PATH}${query === '' ? '' : `?${query}`}`;
}

/**
 * The inline script for the root layout's `<head>`. On the product site's
 * home page with a `#details` hash, it keeps the referrer and replaces the
 * address with the form page, so the home page is never drawn and Back skips
 * it. It is plain ES5 with no imports, because it runs before any bundle.
 *
 * It acts only on the root domain and `www` (any host when no root domain
 * is set), never on a couple's invite. Keep it equal in effect to
 * `detailsPageUrl`: the test runs both on the same addresses.
 */
export function detailsRedirectScript(rootDomain: string): string {
  const root = JSON.stringify(rootDomain.toLowerCase());
  const key = JSON.stringify(LANDING_REFERRER_KEY);
  const path = JSON.stringify(DETAILS_PATH);
  return [
    '(function(){try{',
    'var l=window.location,h=l.hash,r=' + root + ',n=l.hostname.toLowerCase();',
    "if(l.pathname!=='/')return;",
    "if(!(h==='#details'||/^#details[?&/]/.test(h)))return;",
    "if(!(r===''||n===r||n==='www.'+r))return;",
    'var p=new URLSearchParams(l.search),x=new URLSearchParams(h.slice(9));',
    'x.forEach(function(v,k){if(!p.has(k))p.append(k,v);});',
    'try{if(document.referrer)sessionStorage.setItem(' + key + ',document.referrer);}catch(e){}',
    'var q=p.toString();',
    'l.replace(' + path + "+(q?'?'+q:''));",
    '}catch(e){}})();',
  ].join('');
}
