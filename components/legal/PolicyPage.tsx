import { PageShell } from '@/components/layout/PageShell';
import { BUSINESS } from '@/lib/business';
import { formatUpdated } from '@/lib/seo';

export interface PolicyPageProps {
  title: string;
  /** The plain-language summary that opens the page. */
  summary: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The frame every policy page shares: the title, a short summary in a soft
 * panel, the sections, and the "Last updated" date. A Server Component.
 *
 * Section headings are `h2`, and the text keeps to `max-w-prose`. The date
 * comes from `BUSINESS.policiesUpdated`, so every policy page shows the same.
 */
export function PolicyPage({ title, summary, children }: PolicyPageProps): React.JSX.Element {
  return (
    <PageShell width="reading" className="gap-10 sm:gap-12">
      <header className="flex flex-col gap-4">
        <h1 className="text-hero">{title}</h1>
        <p className="text-small text-ink-soft">
          Last updated{' '}
          <time dateTime={BUSINESS.policiesUpdated}>{formatUpdated(BUSINESS.policiesUpdated)}</time>
        </p>
        <div className="bg-brand-soft rounded-card text-ink max-w-prose p-5">{summary}</div>
      </header>
      <div className="flex max-w-prose flex-col gap-8 [&_h2]:text-title [&_li]:ml-5 [&_li]:list-disc [&_p]:text-ink-soft [&_section]:flex [&_section]:flex-col [&_section]:gap-3 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:text-ink-soft">
        {children}
      </div>
    </PageShell>
  );
}
