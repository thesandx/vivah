import { PRICE_FROM_RUPEES } from '@/lib/business';
import { cn } from '@/lib/utils';

/**
 * The "paper or digital" table on the home page. A Server Component.
 *
 * Every digital row is a feature the invite has today. Do not add a row for
 * a feature that is not built.
 */

type Cell = string | boolean;

const ROWS: readonly { feature: string; paper: Cell; digital: Cell }[] = [
  {
    feature: 'Cost',
    paper: '₹5,000 to ₹50,000+',
    digital: `₹${PRICE_FROM_RUPEES.toLocaleString('en-IN')}, one time`,
  },
  { feature: 'Ready in', paper: '2 to 4 weeks', digital: '5 minutes' },
  { feature: 'Each guest’s name', paper: 'Written by hand', digital: 'On every link' },
  { feature: 'Change it after sending', paper: false, digital: true },
  { feature: 'Venue on Google Maps', paper: false, digital: true },
  { feature: 'Live countdown', paper: false, digital: true },
  { feature: 'RSVP on WhatsApp', paper: false, digital: true },
  { feature: 'Reaches family abroad at once', paper: false, digital: true },
  { feature: 'No paper, no courier', paper: false, digital: true },
];

function Mark({ yes }: { yes: boolean }) {
  return (
    <>
      <svg viewBox="0 0 20 20" aria-hidden="true" className="mx-auto size-5">
        {yes ? (
          <path
            d="m4.5 10.5 3.5 3.5 7.5-8"
            className="stroke-success fill-none"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="m5.5 5.5 9 9m0-9-9 9"
            className="stroke-danger fill-none"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </svg>
      <span className="sr-only">{yes ? 'Yes' : 'No'}</span>
    </>
  );
}

function Value({ cell, strong }: { cell: Cell; strong?: boolean }) {
  if (typeof cell === 'boolean') return <Mark yes={cell} />;
  return <span className={cn(strong && 'font-semibold')}>{cell}</span>;
}

export interface PaperVsDigitalProps {
  className?: string;
}

export function PaperVsDigital({ className }: PaperVsDigitalProps) {
  return (
    <div
      className={cn(
        'border-line bg-surface shadow-hard rounded-card overflow-hidden border-2',
        className,
      )}
    >
      <table className="text-small sm:text-body w-full table-fixed border-collapse">
        <caption className="sr-only">Paper invitations compared with a vivah.online invite</caption>
        <thead>
          <tr className="border-line border-b-2">
            <th scope="col" className="p-3 text-left sm:p-4">
              Feature
            </th>
            <th scope="col" className="p-3 sm:p-4">
              Paper
            </th>
            <th scope="col" className="bg-brand-soft p-3 sm:p-4">
              vivah.online
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.feature} className="border-sunken border-t-2 first:border-t-0">
              <th scope="row" className="p-3 text-left font-normal sm:p-4">
                {row.feature}
              </th>
              <td className="text-ink-soft p-3 text-center sm:p-4">
                <Value cell={row.paper} />
              </td>
              <td className="bg-brand-soft p-3 text-center sm:p-4">
                <Value cell={row.digital} strong />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
