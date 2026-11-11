import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { formatAdminTime } from '@/lib/admin-list';
import {
  INVITE_CHANGE_AREA_LABELS,
  type InviteChangeArea,
  type InviteChangeLine,
} from '@/lib/invite-changes';

/**
 * What the couple changed from their dashboard, newest first (ADR-0020): one
 * entry per save, one line per field, old value to new. A Server Component.
 * Changes made from `/admin` are in the audit log, not here.
 */
export interface InviteChangeEntry {
  id: string;
  area: InviteChangeArea;
  lines: readonly InviteChangeLine[];
  at: Date;
}

export interface InviteChangesCardProps {
  /** `null` when the log did not load. */
  entries: readonly InviteChangeEntry[] | null;
  /** True when there are older entries than the card shows. */
  more: boolean;
}

function Value({ value }: { value: string | null }) {
  if (value === null) return <span className="text-ink-soft italic">empty</span>;
  return <span className="break-words">{value}</span>;
}

export function InviteChangesCard({ entries, more }: InviteChangesCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading">Changes by the couple</h2>
        <p className="text-small text-ink-soft">
          Each save from their dashboard, with the old and the new value. Your own changes from this
          page are in the audit log.
        </p>
      </div>
      {entries === null && (
        <Alert tone="danger" title="The changes did not load.">
          Reload the page. If it fails again, check the logs for “invite changes”.
        </Alert>
      )}
      {entries !== null && entries.length === 0 && (
        <p className="text-small text-ink-soft">The couple has not changed anything yet.</p>
      )}
      {entries !== null && entries.length > 0 && (
        <ol className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id} className="border-line flex flex-col gap-2 border-l-2 pl-4">
              <p className="text-small">
                <span className="font-semibold">{INVITE_CHANGE_AREA_LABELS[entry.area]}</span>
                <span className="text-ink-soft"> · {formatAdminTime(entry.at)}</span>
              </p>
              <ul className="text-small flex flex-col gap-1">
                {entry.lines.map((line, index) => (
                  <li key={index}>
                    <span className="text-ink-soft">{line.label}: </span>
                    {line.from === null ? (
                      <Value value={line.to} />
                    ) : (
                      <>
                        <Value value={line.from} /> → <Value value={line.to} />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {more && <p className="text-small text-ink-soft">Showing the newest 100 saves.</p>}
    </Card>
  );
}
