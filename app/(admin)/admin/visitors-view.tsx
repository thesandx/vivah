import Link from 'next/link';

import { Alert } from '@/components/ui/Alert';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import type { SearchParams } from '@/lib/admin-list';
import { logger } from '@/lib/logger';
import {
  buildVisitReport,
  type GroupRow,
  SOURCE_LABELS,
  VISIT_RANGES,
  visitRangeFrom,
  type VisitReport,
} from '@/lib/visit-report';
import { VISIT_SOURCES, type VisitSource } from '@/lib/visit-tracking';
import { listAllLeads } from '@/services/admin.service';
import { beaconsSince } from '@/services/visit.service';

/**
 * The Visitors tab of `/admin`: how home page visits went (ADR-0014). Which
 * sections people saw and for how long, where they stopped scrolling, how far
 * they got in the sign-up card, and which button led to each preview.
 *
 * It reads the stored beacons for the chosen range and the leads, so a
 * preview paid for in another browser still counts as paid.
 */

const DAY_MS = 24 * 60 * 60_000;

async function load(days: number): Promise<{ report: VisitReport; capped: boolean } | null> {
  try {
    const since = new Date(Date.now() - days * DAY_MS);
    const [beacons, leads] = await Promise.all([beaconsSince(since), listAllLeads()]);
    const paid = new Set(
      leads.items.filter((lead) => lead.status === 'paid').map((lead) => lead.id),
    );
    return {
      report: buildVisitReport(beacons.items, (id) => paid.has(id)),
      capped: beacons.capped,
    };
  } catch (error) {
    logger.error('Loading the visitors report failed', error);
    return null;
  }
}

function seconds(value: number): string {
  if (value < 60) return `${value}s`;
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card as="div" className="flex flex-col gap-1">
      <span className="text-small text-ink-soft">{label}</span>
      <span className="text-title">{value}</span>
      {note !== undefined && <span className="text-small text-ink-soft">{note}</span>}
    </Card>
  );
}

/** A table that scrolls sideways inside its frame on a phone, never the page. */
function Table({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: readonly string[];
  rows: readonly (readonly [string, ...(string | number)[]])[];
}) {
  return (
    <div className="border-line rounded-card bg-surface overflow-x-auto border-2">
      <table className="text-small sm:text-body w-full min-w-120 text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-sunken">
          <tr>
            {head.map((cell, index) => (
              <th key={cell} scope="col" className={index === 0 ? 'p-3' : 'p-3 text-right'}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([first, ...rest]) => (
            <tr key={first} className="border-line border-t-2">
              <th scope="row" className="p-3 font-medium">
                {first}
              </th>
              {rest.map((cell, index) => (
                <td key={index} className="p-3 text-right tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function groupRows(rows: readonly GroupRow[], label: (key: string) => string) {
  return rows.map(
    (row) =>
      [label(row.key), row.visits, row.previews, row.paid] as const satisfies readonly [
        string,
        ...number[],
      ],
  );
}

function sourceLabel(key: string): string {
  return (VISIT_SOURCES as readonly string[]).includes(key)
    ? SOURCE_LABELS[key as VisitSource]
    : key;
}

export async function VisitorsView({ params }: { params: SearchParams }) {
  const range = visitRangeFrom(params.days);
  const loaded = await load(range.days);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="text-title">Visitors</h2>
        <p className="text-ink-soft">
          Home page visits: what people saw, where they stopped, and which button made each preview.
          One visit is one browser tab. No names or numbers are kept.
        </p>
      </header>
      <nav aria-label="Time range" className="flex flex-wrap gap-3">
        {VISIT_RANGES.map((item) => (
          <Link
            key={item.value}
            href={`/admin?view=visitors&days=${item.value}`}
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
        <Alert tone="danger" title="The report did not load.">
          Reload the page. If it fails again, check the logs for “visitors report”.
        </Alert>
      )}
      {loaded?.capped === true && (
        <Alert tone="info" title="Showing the newest 6,000 reports only.">
          Choose a shorter range for exact numbers.
        </Alert>
      )}
      {loaded !== null && loaded.report.visits === 0 && (
        <EmptyState title="No visits yet">
          Visits show here a few seconds after someone leaves the home page.
        </EmptyState>
      )}
      {loaded !== null && loaded.report.visits > 0 && <Report report={loaded.report} />}
    </>
  );
}

function Report({ report }: { report: VisitReport }) {
  const rate = (part: number) =>
    report.visits === 0 ? '0%' : `${((part / report.visits) * 100).toFixed(1)}%`;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Visits" value={report.visits.toLocaleString('en-IN')} />
        <Stat
          label="Previews made"
          value={report.previews.toLocaleString('en-IN')}
          note={`${rate(report.convertedVisits)} of visits`}
        />
        <Stat
          label="Paid"
          value={report.paid.toLocaleString('en-IN')}
          note={`${rate(report.paid)} of visits`}
        />
      </div>

      <section aria-labelledby="visitors-scroll" className="flex flex-col gap-3">
        <h3 id="visitors-scroll" className="text-heading">
          How far people scroll
        </h3>
        <p className="text-small text-ink-soft">
          A section counts as seen after 1 second in the middle of the screen. “Left here” is a
          visit with no preview whose last section was this one.
        </p>
        <Table
          caption="Each home section: visits that saw it, time, and where visits stopped"
          head={['Section', 'Saw it', 'Median time', 'Share of time', 'Left here']}
          rows={report.sections.map((row) => [
            row.label,
            `${row.seen} (${row.seenPercent}%)`,
            seconds(row.medianSeconds),
            `${row.timeShare}%`,
            row.leftHere,
          ])}
        />
      </section>

      <section aria-labelledby="visitors-card" className="flex flex-col gap-3">
        <h3 id="visitors-card" className="text-heading">
          Sign-up card
        </h3>
        <Card as="div" className="flex flex-col gap-4">
          {report.steps.map((step) => (
            <Progress
              key={step.id}
              label={step.label}
              value={step.percent}
              valueText={`${step.visits} visits (${step.percent}%)`}
            />
          ))}
        </Card>
      </section>

      <section aria-labelledby="visitors-buttons" className="flex flex-col gap-3">
        <h3 id="visitors-buttons" className="text-heading">
          Buttons
        </h3>
        <p className="text-small text-ink-soft">
          A preview goes to the last sign-up button tapped before it, or to the hero card when the
          couple filled that in.
        </p>
        <Table
          caption="Each button: visits that tapped it, taps, previews and payments"
          head={['Button', 'Visits', 'Taps', 'Previews', 'Paid']}
          rows={report.ctas.map((row) => [row.label, row.visits, row.taps, row.previews, row.paid])}
        />
      </section>

      <section aria-labelledby="visitors-sources" className="flex flex-col gap-3">
        <h3 id="visitors-sources" className="text-heading">
          Where visits came from
        </h3>
        <Table
          caption="Visits, previews and payments by source"
          head={['Source', 'Visits', 'Previews', 'Paid']}
          rows={groupRows(report.sources, sourceLabel)}
        />
        <Table
          caption="Visits, previews and payments by device"
          head={['Device', 'Visits', 'Previews', 'Paid']}
          rows={groupRows(report.devices, (key) => key.charAt(0).toUpperCase() + key.slice(1))}
        />
        {report.campaigns.length > 0 && (
          <Table
            caption="Visits, previews and payments by ad campaign"
            head={['Campaign', 'Visits', 'Previews', 'Paid']}
            rows={groupRows(report.campaigns, (key) => key)}
          />
        )}
      </section>
    </>
  );
}
