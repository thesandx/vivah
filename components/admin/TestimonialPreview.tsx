import { ChatNoteCard } from '@/components/home/ChatNoteCard';
import { CoupleReviewCard } from '@/components/home/CoupleReviewCard';
import { CHAT_APPS, type ChatApp, type TestimonialKind } from '@/lib/testimonials';

/**
 * The card a chat screenshot or couple review makes on the home page, drawn
 * from the admin form's unsaved fields. It renders the home page's own card
 * component, so the preview cannot drift from the live row: a long review
 * stops after the same six lines, on the same crop of the photo.
 *
 * `values` holds the form's fields by input name, as the Server Action reads
 * them. An empty field shows a short placeholder, so the card keeps its shape
 * while the admin types.
 */

export interface TestimonialPreviewProps {
  kind: TestimonialKind;
  /** The form's fields by input name, such as `quote` or `stars`. */
  values: Readonly<Record<string, string>>;
  /** The chosen or saved image's URL. `null` before one is chosen. */
  image: string | null;
}

/** A transparent pixel: the card's own background shows until there is a photo. */
const NO_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function text(values: TestimonialPreviewProps['values'], name: string): string {
  return (values[name] ?? '').trim();
}

function toStars(value: string): number {
  const stars = Number.parseInt(value, 10);
  return Number.isInteger(stars) && stars >= 1 && stars <= 5 ? stars : 5;
}

function toApp(value: string): ChatApp {
  return CHAT_APPS.find((app) => app === value) ?? 'whatsapp';
}

export function TestimonialPreview({
  kind,
  values,
  image,
}: TestimonialPreviewProps): React.JSX.Element {
  const src = image ?? NO_IMAGE;

  if (kind === 'review') {
    const quote = text(values, 'quote');
    const names = text(values, 'names');
    return (
      <CoupleReviewCard
        quote={quote === '' ? 'Their words show here.' : quote}
        names={names === '' ? 'Their names' : names}
        relation={text(values, 'relation')}
        stars={toStars(text(values, 'stars'))}
        image={src}
      />
    );
  }

  const message = text(values, 'message');
  return (
    <ChatNoteCard
      message={message === '' ? 'The message shows here.' : message}
      caption={text(values, 'caption')}
      app={toApp(text(values, 'app'))}
      image={src}
      tilt="left"
    />
  );
}
