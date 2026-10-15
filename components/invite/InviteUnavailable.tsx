import { Face } from '@/components/ui/Face';

/**
 * Shown at a couple's address while the admin has made the invite
 * unavailable, on the couple's request. Polite and vague on purpose: it names
 * nobody and gives no reason. A Server Component.
 */
export function InviteUnavailable() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-5 py-12 sm:px-8">
      <span className="bg-sunken border-line inline-grid size-20 place-items-center rounded-full border-2">
        <Face mood="sleepy" size={64} />
      </span>
      <h1 className="text-title">This invite is not available right now</h1>
      <p className="text-ink-soft max-w-prose">
        The couple has paused it for a while. Check back later, or ask them for the latest link.
      </p>
    </main>
  );
}
