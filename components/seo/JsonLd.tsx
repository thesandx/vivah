/**
 * Prints schema.org data as a JSON-LD `<script>`, which search engines and AI
 * answer engines read to understand the page. A Server Component: the data is
 * in the first HTML, so a crawler that runs no JavaScript still sees it.
 *
 * `<` is escaped, so a value that contains `</script>` cannot end the tag.
 */

export interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  // React escapes children of <script>, which breaks JSON. The value is our
  // own data with `<` escaped above, so setting it as HTML is safe.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
