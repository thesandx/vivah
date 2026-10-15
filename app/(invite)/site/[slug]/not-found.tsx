import { Face } from '@/components/ui/Face';

/**
 * Shown at a couple's address when no wedding uses it. No link home: on an
 * invite host, `/` is this same page, and a guest has nowhere else to go.
 */
export default function InviteNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-5 py-12 sm:px-8">
      <span className="bg-sunken border-line inline-grid size-20 place-items-center rounded-full border-2">
        <Face mood="sleepy" size={64} />
      </span>
      <h1 className="text-title">No invite at this address</h1>
      <p className="text-ink-soft max-w-prose">
        Check the link in your message. The couple may have sent a different one.
      </p>
    </main>
  );
}
