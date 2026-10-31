import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { formatAdminTime } from '@/lib/admin-list';
import type { PreviewActivity } from '@/lib/preview-report';

/**
 * What one couple did on their preview (ADR-0019): who opened it, how long
 * they looked, how far they scrolled, and each step towards payment. A
 * Server Component.
 */
export interface PreviewActivityCardProps {
  /** `null` when the activity did not load. */
  activity: PreviewActivity | null;
}

function duration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function PreviewActivityCard({ activity }: PreviewActivityCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-heading">Preview activity</h2>
      {activity === null && (
        <Alert tone="danger" title="The activity did not load.">
          Reload the page. If it fails again, check the logs for “preview activity”.
        </Alert>
      )}
      {activity !== null && activity.views === 0 && (
        <p className="text-small text-ink-soft">
          Nothing measured yet. Activity shows a few seconds after somebody leaves the preview. Your
          own views from this admin browser are not counted.
        </p>
      )}
      {activity !== null && activity.views > 0 && (
        <>
          <dl className="text-small grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-ink-soft">Opened</dt>
              <dd className="font-semibold">
                {activity.views} {activity.views === 1 ? 'time' : 'times'}
              </dd>
              <dd className="text-ink-soft">
                {activity.coupleViews} by the couple · {activity.otherViews} by others
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Time on the invite</dt>
              <dd className="font-semibold">{duration(activity.totalSeconds)}</dd>
              <dd className="text-ink-soft">Furthest: {activity.furthest ?? 'the cover'}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Last seen</dt>
              <dd className="font-semibold">
                {activity.lastAt === null ? 'Never' : formatAdminTime(activity.lastAt)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Steps</h3>
            <ul className="text-small flex flex-col gap-1">
              {activity.events.map((event) => (
                <li key={event.id} className="flex flex-wrap justify-between gap-x-3">
                  <span>
                    {event.label}
                    {event.count > 1 && ` ×${event.count}`}
                  </span>
                  <span className="text-ink-soft">{formatAdminTime(event.firstAt)}</span>
                </li>
              ))}
            </ul>
          </div>

          <details className="border-line rounded-card border-2">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 font-semibold">
              Time per section and every view
            </summary>
            <div className="border-line flex flex-col gap-4 border-t-2 p-4">
              <ul className="text-small flex flex-col gap-1">
                {activity.sections.map((section) => (
                  <li key={section.id} className="flex justify-between gap-3">
                    <span>{section.label}</span>
                    <span className="tabular-nums">{duration(section.seconds)}</span>
                  </li>
                ))}
              </ul>
              <ol className="text-small flex flex-col gap-2">
                {activity.timeline.map((line, index) => (
                  <li key={index} className="flex flex-col">
                    <span className="text-ink-soft">
                      {formatAdminTime(line.at)} · {line.viewer === 'couple' ? 'Couple' : 'Other'} ·{' '}
                      {line.device}
                    </span>
                    <span>{line.labels.join(' → ')}</span>
                  </li>
                ))}
              </ol>
            </div>
          </details>
        </>
      )}
    </Card>
  );
}
