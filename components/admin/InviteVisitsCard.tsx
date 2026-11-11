import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { formatAdminTime } from '@/lib/admin-list';
import type { InviteVisitReport } from '@/lib/invite-visit-report';

/**
 * How many people opened one live invite (ADR-0020): opens, new visitors,
 * envelope and RSVP taps, each guest link, and the last 14 days. A Server
 * Component.
 */
export interface InviteVisitsCardProps {
  /** `null` when the visits did not load. */
  report: InviteVisitReport | null;
  /** True when the invite has more beacons than the card reads. */
  capped: boolean;
}

function times(count: number): string {
  return `${count} ${count === 1 ? 'time' : 'times'}`;
}

/** `10 Nov` from `2026-11-10`. */
function shortDay(day: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`));
}

export function InviteVisitsCard({ report, capped }: InviteVisitsCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading">Visits</h2>
        <p className="text-small text-ink-soft">
          Counted on the live invite with no cookie. Your views from this admin page are never
          counted. The couple&apos;s own views from their dashboard are counted apart.
        </p>
      </div>
      {report === null && (
        <Alert tone="danger" title="The visits did not load.">
          Reload the page. If it fails again, check the logs for “invite beacons”.
        </Alert>
      )}
      {report !== null && report.opens === 0 && report.coupleOpens === 0 && (
        <p className="text-small text-ink-soft">
          No visits yet. A visit shows a few seconds after a guest opens the link.
        </p>
      )}
      {report !== null && (report.opens > 0 || report.coupleOpens > 0) && (
        <>
          {capped && (
            <Alert tone="info" title="Busy invite">
              These counts cover the newest 5,000 visits and taps only.
            </Alert>
          )}
          <dl className="text-small grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-ink-soft">Total visits</dt>
              <dd className="text-heading tabular-nums">{report.opens}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Visitors</dt>
              <dd className="text-heading tabular-nums">{report.visitors}</dd>
              <dd className="text-ink-soft">first time on a phone or computer</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Opened the invite</dt>
              <dd className="text-heading tabular-nums">{report.envelopeOpens}</dd>
              <dd className="text-ink-soft">tapped the cover</dd>
            </div>
            <div>
              <dt className="text-ink-soft">RSVP taps</dt>
              <dd className="text-heading tabular-nums">{report.rsvpTaps}</dd>
            </div>
          </dl>
          <dl className="text-small grid gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-ink-soft">Last visit</dt>
              <dd>{report.lastAt === null ? 'None yet' : formatAdminTime(report.lastAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Devices</dt>
              <dd>
                {report.devices.phone} phone · {report.devices.tablet} tablet ·{' '}
                {report.devices.desktop} computer
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Couple&apos;s own visits</dt>
              <dd>{times(report.coupleOpens)}</dd>
            </div>
          </dl>

          {report.links.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">By guest link</h3>
              <ul className="text-small flex flex-col gap-2">
                {report.links.map((link) => (
                  <li
                    key={link.id ?? link.label}
                    className="flex flex-wrap items-baseline justify-between gap-x-3"
                  >
                    <span className="font-semibold">{link.label}</span>
                    <span className="text-ink-soft tabular-nums">
                      {times(link.opens)} · {link.visitors} new
                      {link.rsvpTaps > 0 && ` · RSVP ×${link.rsvpTaps}`} · last{' '}
                      {formatAdminTime(link.lastAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="border-line rounded-card border-2">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 font-semibold">
              Last 14 days{report.unopenedLinks.length > 0 && ' and links not opened yet'}
            </summary>
            <div className="border-line flex flex-col gap-4 border-t-2 p-4">
              <ul className="text-small flex flex-col gap-1">
                {report.days.map((day) => (
                  <li key={day.day} className="flex justify-between gap-3">
                    <span>{shortDay(day.day)}</span>
                    <span className="tabular-nums">
                      {day.opens} {day.opens === 1 ? 'visit' : 'visits'} · {day.visitors} new
                    </span>
                  </li>
                ))}
              </ul>
              {report.unopenedLinks.length > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">Not opened yet ({report.unopenedLinks.length})</h3>
                  <p className="text-small text-ink-soft">{report.unopenedLinks.join(', ')}</p>
                </div>
              )}
            </div>
          </details>
        </>
      )}
    </Card>
  );
}
