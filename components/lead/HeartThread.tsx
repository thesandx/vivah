import { cn } from '@/lib/utils';

/**
 * A red thread that draws itself from left to right and ties a heart in the
 * middle: the moment between a tap on "Begin our story" and the sign-up
 * dialog. It fills the screen on the paper colour, so the page steps back.
 *
 * Decoration only, so it is hidden from screen readers; the dialog that
 * follows carries the meaning. CSS draws it (`animate-thread-draw`), so it
 * adds no script. `SignupDialogProvider` waits `HEART_THREAD_MS`, then opens
 * the dialog, and skips this drawing when the visitor asks for reduced motion.
 */

/** How long the thread takes to draw. Matches `--animate-thread-draw` in styles/globals.css. */
export const HEART_THREAD_DRAW_MS = 1300;
/** The whole moment: the drawing, then a short look at the finished heart. */
export const HEART_THREAD_MS = HEART_THREAD_DRAW_MS + 350;

/*
 * One stroke: in from the left, up the heart's left side, over both lobes,
 * down to its point, a small loop where the thread crosses itself, and out to
 * the right.
 */
export const THREAD_PATH =
  'M24 132 C120 158 214 118 300 150 C270 124 234 96 240 64 C246 34 292 30 300 66 C308 30 354 34 360 64 C366 96 330 124 300 150 C288 162 292 176 310 168 C332 154 356 126 404 130 C474 136 520 150 576 120';

export interface HeartThreadProps {
  /** `leaving` fades the screen out while the dialog rises over it. */
  phase: 'drawing' | 'leaving';
  className?: string;
}

export function HeartThread({ phase, className }: HeartThreadProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-paper animate-fade-in fixed inset-0 z-50 grid place-items-center px-4 transition-opacity duration-300',
        phase === 'leaving' && 'opacity-0',
        className,
      )}
    >
      <svg viewBox="0 0 600 200" className="w-full max-w-2xl" fill="none">
        <path
          d={THREAD_PATH}
          pathLength={1}
          strokeDasharray="1 1"
          className="stroke-brand animate-thread-draw"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* The two ends of the thread: one where it starts, one that arrives with it. */}
        <circle cx="24" cy="132" r="5" className="fill-brand" />
        <circle
          cx="576"
          cy="120"
          r="5"
          className="fill-brand animate-pop"
          style={{ animationDelay: `${HEART_THREAD_DRAW_MS - 120}ms` }}
        />
      </svg>
    </div>
  );
}
