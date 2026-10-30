import Link from 'next/link';

import { Stat, Table } from '@/app/(admin)/admin/visitors-view';
import { Alert } from '@/components/ui/Alert';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import type { SearchParams } from '@/lib/admin-list';
import { leadTag } from '@/lib/lead-tags';
import { logger } from '@/lib/logger';
import { buildPreviewFunnel, type PreviewFunnel } from '@/lib/preview-report';
import { VISIT_RANGES, visitRangeFrom } from '@/lib/visit-report';
import { listAllLeads } from '@/services/admin.service';
import { previewBeaconsSince } from '@/services/preview-beacon.service';

/**
 * The Preview tracker tab of `/admin`: what couples do on their preview, over
 * many previews (ADR-0019). How many open the invite, scroll to the end,
 * open the pay sheet, tap pay, and close the payment window. One preview's
 * own activity is on `/admin/previews/<id>`.
 *
 * Previews tagged Test, deleted ones and made-up ids are left out.
 */

const DAY_MS = 24 * 60 * 60_000;

async function load(days: number): Promise<{ funnel: PreviewFunnel; capped: boolean } | null> {
  try {
    const since = new Date(Date.now() - days * DAY_MS);
    const [beacons, leads] = await Promise.all([previewBeaconsSince(since), listAllLeads()]);
    const real = new Set(
      leads.items
        .filter((lead) => lead.deletedAt === null && leadTag(lead) !== 'test')
        .map((lead) => lead.id),
    );
    const paid = new Set(
      leads.items.filter((lead) => lead.status === 'paid').map((lead) => lead.id),
    );
    return {
      funnel: buildPreviewFunnel(
        beacons.items,
        (id) => real.has(id),
        (id) => paid.has(id),
      ),
      capped: beacons.capped,
    };
  } catch (error) {
    logger.error('Loading the preview tracker failed', error);
    return null;
  }
}

function seconds(value: number): string {
  if (value < 60) return `${value}s`;
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}

export async function PreviewTrackerView({ params }: { params: SearchParams }) {
  const range = visitRangeFrom(params.days);
  const loaded = await load(range.days);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="text-title">Preview tracker</h2>
        <p className="text-ink-soft">
          What couples do on their preview, from opening the invite to the payment window. Open a
          preview in the Previews tab to see one couple&apos;s steps. Test previews are left out.
        </p>
      </header>
      <nav aria-label="Time range" className="flex flex-wrap gap-3">
        {VISIT_RANGES.map((item) => (
          <Link
            key={item.value}
            href={`/admin?view=tracker&days=${item.value}`}
            aria-current={item.value === range.value ? 'page' : undefined}
            className={buttonStyles({
              variant: item.value === range.value ? 'primary' : 'secondary',
            })}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {loaded === null && (
        <Alert tone="danger" title="The tracker did not load.">
          Reload the page. If it fails again, check the logs for “preview tracker”.
        </Alert>
      )}
      {loaded?.capped === true && (
        <Alert tone="info" title="Showing the newest 6,000 reports only.">
          Choose a shorter range for exact numbers.
        </Alert>
      )}
      {loaded !== null && loaded.funnel.previews === 0 && (
        <EmptyState title="Nothing measured yet">
          Previews show here a few seconds after a couple leaves their preview page.
        </EmptyState>
      )}
      {loaded !== null && loaded.funnel.previews > 0 && <Funnel funnel={loaded.funnel} />}
    </>
  );
}

function Funnel({ funnel }: { funnel: PreviewFunnel }) {
  const paid = funnel.steps.find((step) => step.id === 'paid');
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Previews looked at" value={funnel.previews.toLocaleString('en-IN')} />
        <Stat
          label="Shared with family"
          value={funnel.shared.toLocaleString('en-IN')}
          note="Opened by somebody besides the couple"
        />
        <Stat
          label="Paid"
          value={(paid?.previews ?? 0).toLocaleString('en-IN')}
          note={`${paid?.percent ?? 0}% of previews looked at`}
        />
      </div>

      <section aria-labelledby="tracker-funnel" className="flex flex-col gap-3">
        <h3 id="tracker-funnel" className="text-heading">
          Steps to payment
        </h3>
        <p className="text-small text-ink-soft">
          Each line counts previews where it happened at least once, in any browser. Median time on
          the invite: {seconds(funnel.medianSeconds)}.
        </p>
        <Card as="div" className="flex flex-col gap-4">
          {funnel.steps.map((step) => (
            <Progress
              key={step.id}
              label={step.label}
              value={step.percent}
              valueText={`${step.previews} (${step.percent}%)`}
            />
          ))}
        </Card>
      </section>

      <section aria-labelledby="tracker-sections" className="flex flex-col gap-3">
        <h3 id="tracker-sections" className="text-heading">
          How far people scroll
        </h3>
        <p className="text-small text-ink-soft">
          A section counts as seen after 1 second in the middle of the screen.
        </p>
        <Table
          caption="Each invite section: previews that saw it, and the median time there"
          head={['Section', 'Saw it', 'Median time']}
          rows={funnel.sections.map((row) => [
            row.label,
            `${row.seenPercent}%`,
            seconds(row.medianSeconds),
          ])}
        />
      </section>

      <section aria-labelledby="tracker-closed" className="flex flex-col gap-3">
        <h3 id="tracker-closed" className="text-heading">
          After the 30 minutes
        </h3>
        <p className="text-small text-ink-soft">
          {funnel.closedSeen} {funnel.closedSeen === 1 ? 'preview was' : 'previews were'} opened
          again after it closed. {funnel.closedWhatsApp} of them tapped WhatsApp to ask us to reopen
          it.
        </p>
      </section>
    </>
  );
}
