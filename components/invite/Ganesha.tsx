import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * Shri Ganesh, seated on a lotus, at the top of the names card, over the
 * shloka, as on a printed Hindu wedding card. The line art is the product
 * owner's own image, tinted to the invite's rose ink
 * (`public/invite/ganesha.png`). It floats up and down by a few pixels,
 * slowly; the global reduced-motion rule stops it for guests who ask for less
 * motion. A Server Component, and decoration: the shloka under it carries
 * the meaning.
 */

export interface GaneshaProps {
  className?: string;
}

export function Ganesha({ className }: GaneshaProps): React.JSX.Element {
  return (
    <Image
      src="/invite/ganesha.png"
      alt=""
      width={480}
      height={480}
      priority
      className={cn('animate-float h-auto w-36 sm:w-44', className)}
    />
  );
}
