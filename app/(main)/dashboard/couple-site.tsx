import { SignOutButton } from '@/components/auth/SignOutButton';
import { FamiliesForm } from '@/components/dashboard/FamiliesForm';
import { FunctionsForm } from '@/components/dashboard/FunctionsForm';
import { GuestLinks } from '@/components/dashboard/GuestLinks';
import { SongPicker } from '@/components/dashboard/SongPicker';
import { WeddingDetailsForm } from '@/components/dashboard/WeddingDetailsForm';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { coupleNames } from '@/lib/couple-names';
import { env } from '@/lib/env';
import { inviteOrigin } from '@/lib/invite-meta';
import { logger } from '@/lib/logger';
import { formatPhoneForDisplay } from '@/lib/phone';
import { inviteHostLabel, inviteHref } from '@/lib/site-host';
import { type SongOption, songUrl } from '@/lib/wedding-songs';
import { listGuestLinks } from '@/services/guest-link.service';
import type { WeddingDocument } from '@/services/wedding.service';
import { listSongOptions } from '@/services/wedding-songs.service';

import {
  createGuestLinkAction,
  deleteGuestLinkAction,
  saveFamiliesAction,
  saveFunctionsAction,
  saveSongAction,
} from './actions';
import { saveWeddingDetailsAction } from './edit/[slug]/actions';

/**
 * A couple's own site in the dashboard: the address, the details (read-only
 * until "Edit details"), the family names, the functions, the song and the guest links. `/dashboard` shows it for the
 * couple's site; `/dashboard/edit/<slug>` shows it for any other site on the
 * same number.
 *
 * The caller has already checked that the session's phone number owns
 * `wedding`. Every Server Action here checks it again.
 */
export async function CoupleSite({
  wedding,
  phoneE164,
}: {
  wedding: WeddingDocument;
  phoneE164: string;
}) {
  const [links, songs] = await Promise.all([listGuestLinks(wedding.id), songOptions()]);
  const currentSong = wedding.song ?? null;
  const currentSlot =
    currentSong === null
      ? null
      : (songs.find((option) => option.src === songUrl(currentSong.file))?.slot ?? null);
  const origin = inviteOrigin(wedding.slug, env.rootDomain, env.appUrl);
  const names = coupleNames(wedding);

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-title break-words">{names}</h1>
          <a
            href={inviteHref(wedding.slug, env.rootDomain)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand decoration-butter font-semibold break-all underline decoration-2 underline-offset-4"
          >
            {inviteHostLabel(wedding.slug, env.rootDomain)}
          </a>
          {wedding.status === 'unavailable' && (
            <Badge tone="brand" className="self-start">
              Paused: guests see &ldquo;not available&rdquo;
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-small text-ink-soft">
            Signed in as{' '}
            <span className="text-ink font-medium">{formatPhoneForDisplay(phoneE164)}</span>
          </p>
          <SignOutButton redirectTo="/" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading">Your details</h2>
            <p className="text-small text-ink-soft">
              Guests see a change as soon as you save. Your web address stays the same, so links you
              already sent keep working.
            </p>
          </div>
          <WeddingDetailsForm
            save={saveWeddingDetailsAction.bind(null, wedding.slug)}
            inviteHref={inviteHref(wedding.slug, env.rootDomain)}
            initial={{
              bride: wedding.bride,
              groom: wedding.groom,
              nameOrder: wedding.nameOrder ?? 'bride-first',
              weddingDate: wedding.weddingDate ?? '',
              ceremonyTime: wedding.ceremonyTime ?? '',
              venueName: wedding.venueName ?? '',
              venueCity: wedding.venueCity ?? '',
              venueMapsUrl: wedding.venueMapsUrl ?? '',
            }}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading">Your families</h2>
            <p className="text-small text-ink-soft">
              Your parents&rsquo; and grandparents&rsquo; names, on both sides. Your invite shows
              them in an &ldquo;Our Families&rdquo; section, before the functions.
            </p>
          </div>
          <FamiliesForm
            initial={wedding.families}
            nameOrder={wedding.nameOrder}
            save={saveFamiliesAction.bind(null, wedding.slug)}
            inviteHref={inviteHref(wedding.slug, env.rootDomain)}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading">Your functions</h2>
            <p className="text-small text-ink-soft">
              Tilak, haldi, mehndi, sangeet and reception, each with its own date and venue. Your
              invite shows them with the wedding, in date order.
            </p>
          </div>
          <FunctionsForm
            initial={wedding.functions ?? []}
            save={saveFunctionsAction.bind(null, wedding.slug)}
            inviteHref={inviteHref(wedding.slug, env.rootDomain)}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading">Your song</h2>
            <p className="text-small text-ink-soft">
              Guests can play it on your website. Tap play to listen, then save.
            </p>
          </div>
          <SongPicker
            songs={songs}
            currentSlot={currentSlot}
            currentName={currentSong?.name ?? null}
            save={saveSongAction.bind(null, wedding.slug)}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading">Guest invite links</h2>
            <p className="text-small text-ink-soft">
              Make a link for each guest. It opens your invite with &ldquo;Hi&rdquo; and their name.
            </p>
          </div>
          <GuestLinks
            coupleNames={names}
            create={createGuestLinkAction.bind(null, wedding.slug)}
            remove={deleteGuestLinkAction.bind(null, wedding.slug)}
            links={links.map((link) => ({
              id: link.id,
              name: link.name,
              url: `${origin}/${link.segment}`,
            }))}
          />
        </Card>
      </div>
    </>
  );
}

/** The songs to choose from. A failed read hides the choice, not the dashboard. */
async function songOptions(): Promise<SongOption[]> {
  try {
    return await listSongOptions();
  } catch (error) {
    logger.error('Reading the wedding songs failed', error);
    return [];
  }
}
