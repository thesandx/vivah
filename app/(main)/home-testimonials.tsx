import { ChatNoteCard } from '@/components/home/ChatNoteCard';
import { CoupleReviewCard } from '@/components/home/CoupleReviewCard';
import { LovedByBanner } from '@/components/home/LovedByBanner';
import { SectionHeading } from '@/components/home/SectionHeading';
import { SectionCta } from '@/components/lead/SectionCta';
import { AutoScroller } from '@/components/ui/AutoScroller';
import { logger } from '@/lib/logger';
import { testimonialImageUrl } from '@/lib/testimonials';
import {
  getHomeTestimonials,
  type HomeTestimonials as Content,
} from '@/services/testimonials.service';

/**
 * The home page's "Loved by …" banner and its two rows of what couples say:
 * their reviews, on their photos, and the chats they sent us. An async
 * Server Component, so the home page streams it in behind a `Suspense`.
 *
 * The admin adds all of it from `/admin`. A row with no items does not show,
 * and neither does a banner with no line, so the page never claims a review
 * nobody wrote. A failed read leaves the whole part out; the page still
 * works. See `lib/testimonials.ts`.
 *
 * Each row ends with its own invitation to sign up, as every home page
 * section does. The home page renders this inside `SignupDialogProvider`.
 */

const NONE: Content = { chats: [], reviews: [], headline: '' };

async function load(): Promise<Content> {
  try {
    return await getHomeTestimonials();
  } catch (error) {
    logger.warn('The home page shows no testimonials', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return NONE;
  }
}

export async function HomeTestimonials() {
  const { chats, reviews, headline } = await load();

  return (
    <>
      {headline !== '' && <LovedByBanner headline={headline} />}

      {reviews.length > 0 && (
        <section aria-labelledby="reviews-heading" className="flex flex-col gap-6">
          <SectionHeading
            id="reviews-heading"
            eyebrow="Love notes"
            title="From our couples"
            intro="Real couples, their own words, shared with their permission."
          />
          <AutoScroller
            label="Reviews from couples"
            className="-mx-5 sm:-mx-8"
            items={reviews.map((review) => ({
              key: review.id,
              node: (
                <CoupleReviewCard
                  quote={review.quote}
                  names={review.names}
                  relation={review.relation}
                  stars={review.stars}
                  image={testimonialImageUrl('review', review.id, review.image)}
                />
              ),
            }))}
          />
          <SectionCta
            line="The next love note here could be about the two of you."
            action="Write ours next"
          />
        </section>
      )}

      {chats.length > 0 && (
        <section aria-labelledby="chats-heading" className="flex flex-col gap-6">
          <SectionHeading
            id="chats-heading"
            eyebrow="In the chats"
            title="Messages we got after the invites went out"
            intro="Real chats with our couples, shared with their permission. Names, numbers and links hidden."
          />
          <AutoScroller
            label="Messages from couples"
            className="-mx-5 sm:-mx-8"
            items={chats.map((chat, index) => ({
              key: chat.id,
              node: (
                <ChatNoteCard
                  message={chat.message}
                  caption={chat.caption}
                  app={chat.app}
                  image={testimonialImageUrl('chat', chat.id, chat.image)}
                  tilt={index % 2 === 0 ? 'left' : 'right'}
                />
              ),
            }))}
          />
          <SectionCta
            line="Let the family group gush over the two of you next."
            action="Make the family go aww"
          />
        </section>
      )}
    </>
  );
}
