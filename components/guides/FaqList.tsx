import type { Faq } from '@/lib/seo';

export interface FaqListProps {
  faqs: readonly Faq[];
  heading?: string;
}

/**
 * The page's questions, as plain headings and answers. Every question stays
 * open in the HTML: the `FAQPage` schema must match text a reader can see,
 * and an AI crawler reads only what is in the first response.
 */
export function FaqList({ faqs, heading = 'Questions people ask' }: FaqListProps) {
  return (
    <section aria-labelledby="faq-heading" className="flex flex-col gap-6">
      <h2 id="faq-heading" className="text-title">
        {heading}
      </h2>
      <dl className="flex max-w-prose flex-col gap-6">
        {faqs.map((faq) => (
          <div key={faq.question} className="flex flex-col gap-2">
            <dt className="text-heading">{faq.question}</dt>
            <dd className="text-ink-soft">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
