import { cn } from '@/lib/utils';

/**
 * Shri Ganesh, seated on a lotus, in the invite's line art: rose ink, blush
 * paper and gold foil. He sits at the top of the names card, over the
 * shloka, as on a printed Hindu wedding card. Drawn for Vivah, so there is no
 * image licence to track. A Server Component, and decoration: the shloka
 * under it carries the meaning.
 */

export interface GaneshaProps {
  className?: string;
}

export function Ganesha({ className }: GaneshaProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 200 210" aria-hidden="true" className={cn('h-36 w-auto', className)}>
      <g
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-ink"
      >
        <circle
          cx="100"
          cy="84"
          r="62"
          strokeWidth="1.6"
          strokeDasharray="2 5"
          className="stroke-butter"
        />
        <path d="M80 62 C60 50 36 58 36 80 C36 100 52 114 74 108" className="fill-paper" />
        <path d="M120 62 C140 50 164 58 164 80 C164 100 148 114 126 108" className="fill-paper" />
        <path d="M46 82 C46 70 56 64 68 68" strokeWidth="1.6" className="stroke-butter" />
        <path d="M154 82 C154 70 144 64 132 68" strokeWidth="1.6" className="stroke-butter" />
        <path d="M80 112 C66 114 58 124 56 136 C56 142 62 146 68 142" className="fill-paper" />
        <path
          d="M58 136 C56 128 62 122 66 120 C70 122 76 128 74 136 C72 140 60 140 58 136 Z"
          strokeWidth="1.8"
          className="fill-butter"
        />
        <path
          d="M120 112 C134 114 142 124 144 136 C144 142 138 146 132 142"
          className="fill-paper"
        />
        <path
          d="M72 124 C66 150 78 166 100 166 C122 166 134 150 128 124 C118 116 82 116 72 124 Z"
          className="fill-paper"
        />
        <path d="M76 132 C92 138 108 138 124 132" strokeWidth="1.6" className="stroke-butter" />
        <path
          d="M62 170 C78 160 92 162 100 170 C108 162 122 160 138 170 C122 178 78 178 62 170 Z"
          className="fill-paper"
        />
        <path
          d="M100 196 C88 186 86 178 100 170 C114 178 112 186 100 196 Z"
          className="fill-brand-soft"
        />
        <path
          d="M100 196 C80 196 66 188 60 176 C76 174 92 182 100 196 Z"
          className="fill-brand-soft"
        />
        <path
          d="M100 196 C120 196 134 188 140 176 C124 174 108 182 100 196 Z"
          className="fill-brand-soft"
        />
        <path d="M100 196 C74 200 50 194 38 182 C58 178 82 186 100 196 Z" className="fill-peach" />
        <path
          d="M100 196 C126 200 150 194 162 182 C142 178 118 186 100 196 Z"
          className="fill-peach"
        />
        <path d="M58 203 h84" className="stroke-butter" />
        <path
          d="M78 56 C74 66 72 80 76 90 C80 98 88 102 92 104 L108 104 C112 102 120 98 124 90 C128 80 126 66 122 56 C110 50 90 50 78 56 Z"
          className="fill-paper"
        />
        <path d="M100 96 C100 116 100 130 108 138 C114 144 122 140 120 132" strokeWidth="15" />
        <path
          d="M100 96 C100 116 100 130 108 138 C114 144 122 140 120 132"
          strokeWidth="10.2"
          className="stroke-paper"
        />
        <path d="M97 112 h6 M97 120 h6 M98 128 h6" strokeWidth="1.2" />
        <path d="M90 102 C86 110 86 116 89 120" strokeWidth="3" />
        <path d="M90 102 C86 110 86 116 89 120" strokeWidth="1" className="stroke-paper" />
        <path d="M80 56 L82 38 L90 46 L100 26 L110 46 L118 38 L120 56 Z" className="fill-paper" />
        <path d="M80 56 h40" strokeWidth="3" className="stroke-butter" />
        <circle cx="100" cy="44" r="3" className="fill-butter stroke-none" />
        <circle cx="82" cy="36" r="2" className="fill-butter stroke-none" />
        <circle cx="118" cy="36" r="2" className="fill-butter stroke-none" />
        <circle cx="100" cy="23" r="2" className="fill-butter stroke-none" />
        <path d="M86 78 q4 3 8 0 M106 78 q4 3 8 0" />
        <path
          d="M100 62 C98 66 98 70 100 73 C102 70 102 66 100 62 Z"
          className="fill-brand stroke-none"
        />
        <path d="M94 62 h-6 M106 62 h6" strokeWidth="1.4" className="stroke-brand" />{' '}
      </g>
    </svg>
  );
}
