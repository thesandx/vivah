import {
  hideBannerAction,
  moveTestimonialAction,
  removeTestimonialAction,
  saveBannerAction,
  saveTestimonialAction,
  startTestimonialUploadAction,
} from '@/app/(admin)/admin/actions';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
import { TestimonialForm } from '@/components/admin/TestimonialForm';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { logger } from '@/lib/logger';
import {
  CHAT_APP_NAMES,
  CHAT_APPS,
  MAX_TESTIMONIALS,
  testimonialImageUrl,
  type TestimonialKind,
} from '@/lib/testimonials';
import {
  type ChatItem,
  getHomeTestimonials,
  type HomeTestimonials,
  type ReviewItem,
} from '@/services/testimonials.service';

/**
 * The part of the admin Home page tab that manages what couples say: the
 * banner line, the chat screenshots and the couple reviews. Every button
 * calls a Server Action that checks the admin session again (ADR-0008) and
 * writes the audit log. A Server Component.
 */

const APP_OPTIONS = CHAT_APPS.map((app) => ({ value: app, label: CHAT_APP_NAMES[app] }));
const STAR_OPTIONS = [5, 4, 3, 2, 1].map((stars) => ({
  value: String(stars),
  label: `${stars} star${stars === 1 ? '' : 's'}`,
}));

function ChatFields({ chat }: { chat?: ChatItem }) {
  return (
    <>
      <Textarea
        label="The message"
        name="message"
        rows={3}
        maxLength={240}
        required
        defaultValue={chat?.message ?? ''}
        hint="The line that matters, as the couple wrote it. It shows in quotes above the screenshot."
      />
      <Input
        label="Caption (optional)"
        name="caption"
        maxLength={80}
        defaultValue={chat?.caption ?? ''}
        hint="Under the screenshot, such as “WhatsApp, after the haldi”."
      />
      <Select
        label="From"
        name="app"
        options={APP_OPTIONS}
        defaultValue={chat?.app ?? 'whatsapp'}
      />
    </>
  );
}

function ReviewFields({ review }: { review?: ReviewItem }) {
  return (
    <>
      <Textarea
        label="The review"
        name="quote"
        rows={4}
        maxLength={400}
        required
        defaultValue={review?.quote ?? ''}
        hint="Their words, as sent. It shows on the photo."
      />
      <Input
        label="Names"
        name="names"
        maxLength={60}
        required
        defaultValue={review?.names ?? ''}
        hint="Such as “Riya & Aman”."
      />
      <Input
        label="Who wrote it (optional)"
        name="relation"
        maxLength={60}
        defaultValue={review?.relation ?? ''}
        hint="Such as “Bride and groom” or “Bride’s sister”."
      />
      <Select
        label="Stars"
        name="stars"
        options={STAR_OPTIONS}
        defaultValue={String(review?.stars ?? 5)}
      />
    </>
  );
}

const LISTS = {
  chat: {
    title: 'Chat screenshots',
    intro:
      'The “In the chats” row. Hide names, numbers and links before you upload, and keep the couple’s permission.',
    imageLabel: 'Screenshot',
    noun: 'screenshot',
  },
  review: {
    title: 'Couple reviews',
    intro:
      'The “From our couples” row. A tall photo works best; the words sit on its lower half. Add only real reviews, with the couple’s permission.',
    imageLabel: 'Photo',
    noun: 'review',
  },
} as const;

function ItemControls({
  kind,
  id,
  first,
  last,
}: {
  kind: TestimonialKind;
  id: string;
  first: boolean;
  last: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {!first && (
        <AdminActionForm
          action={moveTestimonialAction.bind(null, kind, id, 'up')}
          label="Move up"
        />
      )}
      {!last && (
        <AdminActionForm
          action={moveTestimonialAction.bind(null, kind, id, 'down')}
          label="Move down"
        />
      )}
      <AdminActionForm
        action={removeTestimonialAction.bind(null, kind, id)}
        label="Remove"
        confirm={{
          title: `Remove this ${LISTS[kind].noun}?`,
          body: 'It leaves the home page. Its record and image are kept, so it can be restored.',
          confirmLabel: 'Remove it',
        }}
      />
    </div>
  );
}

function ListSection({
  kind,
  items,
}: {
  kind: TestimonialKind;
  items: readonly (ChatItem | ReviewItem)[];
}) {
  const list = LISTS[kind];
  const startUpload = startTestimonialUploadAction.bind(null, kind);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h3 className="text-heading">
          {list.title} ({items.length} of {MAX_TESTIMONIALS})
        </h3>
        <p className="text-ink-soft">{list.intro} The row does not show while it is empty.</p>
      </header>

      <ol className="flex flex-col gap-4">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="border-line rounded-card bg-surface flex flex-col gap-4 border-2 p-4 md:flex-row"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- the same route the home page uses */}
            <img
              src={testimonialImageUrl(kind, item.id, item.image)}
              alt=""
              className="rounded-box bg-sunken aspect-3/4 w-32 shrink-0 object-cover object-top"
            />
            <div className="flex flex-1 flex-col gap-4">
              <TestimonialForm
                kind={kind}
                startUpload={startUpload}
                save={saveTestimonialAction.bind(null, kind, item.id)}
                isNew={false}
                imageLabel={list.imageLabel}
                submitLabel="Save changes"
              >
                {'message' in item ? <ChatFields chat={item} /> : <ReviewFields review={item} />}
              </TestimonialForm>
              <ItemControls
                kind={kind}
                id={item.id}
                first={index === 0}
                last={index === items.length - 1}
              />
            </div>
          </li>
        ))}
      </ol>

      {items.length < MAX_TESTIMONIALS ? (
        <div className="border-line rounded-card bg-sunken flex flex-col gap-4 border-2 p-4">
          <h4 className="font-semibold">Add a {list.noun}</h4>
          <TestimonialForm
            kind={kind}
            startUpload={startUpload}
            save={saveTestimonialAction.bind(null, kind, null)}
            isNew
            imageLabel={list.imageLabel}
            submitLabel={`Add the ${list.noun}`}
          >
            {kind === 'chat' ? <ChatFields /> : <ReviewFields />}
          </TestimonialForm>
        </div>
      ) : (
        <Alert
          tone="info"
          title={`The row is full at ${MAX_TESTIMONIALS}. Remove one to add another.`}
        />
      )}
    </section>
  );
}

async function readContent(): Promise<HomeTestimonials | null> {
  try {
    return await getHomeTestimonials({ fresh: true });
  } catch (error) {
    logger.error('Reading the home testimonials failed', error);
    return null;
  }
}

export async function TestimonialsAdmin() {
  const content = await readContent();
  if (content === null) {
    return (
      <Alert tone="danger" title="The reviews and chats could not be read.">
        Reload the page to try again.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h3 className="text-heading">Banner</h3>
          <p className="text-ink-soft">
            One line on a dark banner above the reviews, such as “Loved by 500+ happy couples”. The
            number stands out. Use a number you can show to be true. The banner stays hidden until a
            line is saved.
          </p>
        </header>
        <div className="flex flex-col gap-3">
          <AdminActionForm
            action={saveBannerAction}
            label="Save the banner"
            variant="primary"
            field={{ name: 'headline', label: 'Banner line', defaultValue: content.headline }}
          />
          {content.headline !== '' && (
            <AdminActionForm
              action={hideBannerAction}
              label="Hide the banner"
              confirm={{
                title: 'Hide the banner?',
                body: 'The home page shows no banner until you save a line again.',
                confirmLabel: 'Hide it',
              }}
            />
          )}
        </div>
      </section>

      <ListSection kind="review" items={content.reviews} />
      <ListSection kind="chat" items={content.chats} />
    </div>
  );
}
