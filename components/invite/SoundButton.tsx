import { cn } from '@/lib/utils';

/**
 * The round button pinned to the top right of an open invite that turns the
 * couple's song off and on. It shows a speaker, so a guest sees at once what
 * it does: with sound waves that light up in turn while the song plays, and
 * with a rose slash through it while the song is off. A gold ring on a dark
 * plum circle, in the invite's own colours. A plain component: `InviteGate`
 * holds the audio and passes the state in.
 */

export interface SoundButtonProps {
  playing: boolean;
  /** The song's name, for the accessible name: "Turn off our song, Kesariya". */
  title: string;
  onToggle: () => void;
  className?: string;
}

/** The speaker's cone, with soft, rounded corners, drawn in a 32-unit box. */
const CONE = 'M9.5 11.5h1.5l6.6-5.4a1.3 1.3 0 0 1 2.1 1v17.8a1.3 1.3 0 0 1-2.1 1L11 20.5H9.5Z';

export function SoundButton({
  playing,
  title,
  onToggle,
  className,
}: SoundButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${playing ? 'Turn off' : 'Turn on'} our song, ${title}`}
      aria-pressed={playing}
      className={cn(
        'squish bg-plum-night border-haldi rounded-pill shadow-hard inline-grid size-12 place-items-center border-2',
        className,
      )}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8" fill="none">
        <path d={CONE} className="fill-jewel-light" />
        <rect x="4.5" y="11.5" width="6.5" height="9" rx="2.2" className="fill-haldi" />
        {playing ? (
          <g className="stroke-haldi" strokeWidth="2.2" strokeLinecap="round">
            <path
              d="M23 12.5a5 5 0 0 1 0 7"
              className="animate-sound-wave motion-reduce:animate-none"
            />
            <path
              d="M26 9a9.5 9.5 0 0 1 0 14"
              className="animate-sound-wave motion-reduce:animate-none"
              style={{ animationDelay: '300ms' }}
            />
          </g>
        ) : (
          <path d="M5 6 27 26" className="stroke-rani" strokeWidth="3" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
