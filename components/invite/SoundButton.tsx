import { cn } from '@/lib/utils';

/**
 * The round rose button pinned to the top right of an open invite that pauses and plays the
 * couple's song. While the song plays, three bars move inside it. A plain
 * component: `Envelope` holds the audio and passes the state in.
 */

export interface SoundButtonProps {
  playing: boolean;
  /** The song's name, for the accessible name: "Pause Kesariya". */
  title: string;
  onToggle: () => void;
  className?: string;
}

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
      aria-label={`${playing ? 'Pause' : 'Play'} our song, ${title}`}
      aria-pressed={playing}
      className={cn(
        'squish bg-brand text-on-brand shadow-brand rounded-pill inline-grid size-12 place-items-center',
        className,
      )}
    >
      {playing ? (
        <span aria-hidden="true" className="flex h-5 items-end gap-1">
          {[0, 300, 150].map((delay) => (
            <span
              key={delay}
              className="bg-on-brand animate-sound-bar block h-5 w-1 origin-bottom rounded-pill"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none">
          <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" className="fill-current" />
          <path
            d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
