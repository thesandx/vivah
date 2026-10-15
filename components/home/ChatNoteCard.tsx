import { ScreenshotZoom } from '@/components/home/ScreenshotZoom';
import { CHAT_APP_NAMES, chatAlt, type ChatApp } from '@/lib/testimonials';
import { cn } from '@/lib/utils';

export interface ChatNoteCardProps {
  message: string;
  caption: string;
  app: ChatApp;
  /** The screenshot's URL. */
  image: string;
  /** Tilt the note left or right, so a row of them looks pinned by hand. */
  tilt: 'left' | 'right';
  className?: string;
}

/**
 * One card in the home page's "In the chats" row: a taped paper note with
 * the message that matters, the real screenshot under it, and where it came
 * from. A tap on the screenshot opens it larger. A Server Component; only
 * the zoom is a client part.
 */
export function ChatNoteCard({
  message,
  caption,
  app,
  image,
  tilt,
  className,
}: ChatNoteCardProps): React.JSX.Element {
  return (
    <figure className={cn('flex w-60 flex-col items-center gap-3 pt-3 sm:w-72', className)}>
      <blockquote
        className={cn(
          'bg-surface shadow-hard relative w-full px-5 pt-6 pb-4',
          tilt === 'left' ? '-rotate-1' : 'rotate-1',
        )}
      >
        {/* A strip of tape holds the note to the page. */}
        <span
          aria-hidden="true"
          className="bg-blush/60 absolute -top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 -rotate-3"
        />
        <p className="font-script text-heading">“{message}”</p>
      </blockquote>

      <div
        className={cn(
          'bg-surface shadow-hard-lg w-11/12 p-2',
          tilt === 'left' ? 'rotate-2' : '-rotate-2',
        )}
      >
        <ScreenshotZoom
          src={image}
          alt={chatAlt({ app, message })}
          title={`From ${CHAT_APP_NAMES[app]}`}
        />
      </div>

      <figcaption className="text-small text-ink-soft text-center">
        {caption === '' ? CHAT_APP_NAMES[app] : caption}
      </figcaption>
    </figure>
  );
}
