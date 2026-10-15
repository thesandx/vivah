import type { Faq } from '@/lib/seo';

export interface FaqListProps {
  faqs: readonly Faq[];
  heading?: string;
}

/**
 * The page's questions, each one closed with a + until the reader taps it,
 * then open with a −. A second tap closes it again.
 *
 * Native `<details>` does the opening and closing, so this stays a Server
 * Component with no script. The answers stay in the HTML while closed: the
 * `FAQPage` schema must match text on the page, an AI crawler reads only
 * what is in the first response, and the browser's find-in-page opens the
 * question that holds the match.
 */
export function FaqList({ faqs, heading = 'Questions people ask' }: FaqListProps) {
  return (
    <section aria-labelledby="faq-heading" className="flex flex-col gap-6">
      <h2 id="faq-heading" className="text-title">
        {heading}
      </h2>
      <ul className="flex max-w-prose flex-col gap-3">
        {faqs.map((faq) => (
          <li key={faq.question}>
            <details className="group bg-surface shadow-hard rounded-card">
              <summary className="text-heading flex min-h-11 cursor-pointer items-center justify-between gap-4 px-5 py-4">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="bg-brand-soft rounded-pill grid size-8 shrink-0 place-items-center"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="stroke-ink size-4 fill-none"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M3 8h10" />
                    <path d="M8 3v10" className="group-open:hidden" />
                  </svg>
                </span>
              </summary>
              <p className="text-ink-soft px-5 pb-5">{faq.answer}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
