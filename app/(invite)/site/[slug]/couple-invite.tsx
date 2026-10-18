import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { InviteGate } from '@/components/invite/InviteGate';
import { InviteUnavailable } from '@/components/invite/InviteUnavailable';
import { PreviewShield } from '@/components/invite/PreviewShield';
import { PreviewWatermark } from '@/components/invite/PreviewWatermark';
import { ShubhVivahInvite } from '@/components/invite/ShubhVivahInvite';
import { env } from '@/lib/env';
import { parseGuestName } from '@/lib/guest-name';
import { inviteCard, inviteMetadata, type InviteMetaInput } from '@/lib/invite-meta';
import type { LinkPreviewCard } from '@/lib/link-preview-page';
import { logger } from '@/lib/logger';
import { isSampleSlug, sampleWedding } from '@/lib/sample-invite';
import { editDetailsUrl, inviteDomainLabel, madeByUrl } from '@/lib/site-host';
import { songUrl } from '@/lib/wedding-songs';
import { isGuestLinkDeleted } from '@/services/guest-link.service';
import { getWeddingBySlug, type WeddingDocument } from '@/services/wedding.service';
import { listSongOptions } from '@/services/wedding-songs.service';

/**
 * The couple's invite, shared by the plain link (`sara.vivah.online`) and a
 * guest's link (`sara.vivah.online/Kartheek`). The two routes differ only in
 * the guest name, so both render through here.
 */

/** What the invite shows: a couple's wedding, or the sample. */
interface Invite {
  /** The wedding's id, or `null` for the sample, which has no guest links to delete. */
  id: string | null;
  slug: string;
  bride: string;
  groom: string;
  weddingDate: string | null;
  ceremonyTime: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueMapsUrl: string | null;
  rsvpPhoneE164: string | null;
  song: { name: string; src: string } | null;
  unavailable: boolean;
  /** The sample invite: watermarked, and its edit link and RSVP are left out. */
  sample: boolean;
}

function fromWedding(wedding: WeddingDocument): Invite {
  return {
    id: wedding.id,
    slug: wedding.slug,
    bride: wedding.bride,
    groom: wedding.groom,
    weddingDate: wedding.weddingDate,
    ceremonyTime: wedding.ceremonyTime ?? null,
    venueName: wedding.venueName ?? null,
    venueCity: wedding.venueCity ?? null,
    venueMapsUrl: wedding.venueMapsUrl ?? null,
    rsvpPhoneE164: wedding.ownerPhoneE164,
    song:
      wedding.song === undefined
        ? null
        : { name: wedding.song.name, src: songUrl(wedding.song.file) },
    unavailable: wedding.status === 'unavailable',
    sample: false,
  };
}

/**
 * The sample invite (`lib/sample-invite.ts`), with the first song on the
 * sign-up card. A failed song read shows the sample without music.
 */
async function sampleInvite(slug: string): Promise<Invite> {
  let song: Invite['song'] = null;
  try {
    const [first] = await listSongOptions();
    if (first !== undefined) song = { name: first.name, src: first.src };
  } catch (error) {
    logger.error('Reading the songs for the sample invite failed', error);
  }
  return {
    ...sampleWedding(new Date()),
    id: null,
    slug,
    rsvpPhoneE164: null,
    song,
    unavailable: false,
    sample: true,
  };
}

/**
 * One Firestore read per request, shared by the metadata and the page. A
 * real wedding at the sample's address wins over the sample.
 */
const loadWedding = cache(async (slug: string): Promise<Invite | null> => {
  const wedding = await getWeddingBySlug(slug);
  if (wedding !== null) return fromWedding(wedding);
  return isSampleSlug(slug) ? sampleInvite(slug) : null;
});

/** One guest-link read per request, shared by the metadata and the page. */
const loadDeleted = cache(isGuestLinkDeleted);

/**
 * The guest name from the path, or `null` for no segment, an unusable one, or
 * a link the couple deleted in the dashboard. A deleted link shows the
 * couple's general invite, not an error.
 */
async function guestFrom(wedding: Invite, segment: string | null): Promise<string | null> {
  if (segment === null) return null;
  const name = parseGuestName(segment);
  if (name === null || wedding.id === null) return name;
  return (await loadDeleted(wedding.id, segment)) ? null : name;
}

/**
 * What the link preview needs: `null` for no invite, `'unavailable'` for a
 * paused one, which shows no names.
 */
async function metaInput(
  slug: string,
  guestSegment: string | null,
): Promise<InviteMetaInput | 'unavailable' | null> {
  const wedding = await loadWedding(slug);
  if (wedding === null) return null;
  if (wedding.unavailable) return 'unavailable';

  const guestName = await guestFrom(wedding, guestSegment);
  return {
    slug: wedding.slug,
    bride: wedding.bride,
    groom: wedding.groom,
    weddingDate: wedding.weddingDate,
    guestName,
    ...(guestName !== null && guestSegment !== null && { guestSegment }),
    rootDomain: env.rootDomain,
    appUrl: env.appUrl,
  };
}

export async function coupleInviteMetadata(
  slug: string,
  guestSegment: string | null,
): Promise<Metadata> {
  const input = await metaInput(slug, guestSegment);
  if (input === null) return { title: 'Invite not found', robots: { index: false } };
  if (input === 'unavailable') return { title: 'Invite not available', robots: { index: false } };
  const metadata = inviteMetadata(input);
  // The sample is a demo, not a couple's page: search engines leave it out.
  return isSampleSlug(slug) ? { ...metadata, robots: { index: false, follow: false } } : metadata;
}

/** The card for a link-preview fetcher, or `null` when there is no invite to show. */
export async function coupleInviteCard(
  slug: string,
  guestSegment: string | null,
): Promise<LinkPreviewCard | null> {
  const input = await metaInput(slug, guestSegment);
  return input === null || input === 'unavailable' ? null : inviteCard(input);
}

/**
 * An unusable guest segment (digits, symbols, too long) still shows the
 * invite, with the plain greeting. A guest who got a mistyped link should
 * see the wedding, not "not found".
 */
export async function CoupleInvite({
  slug,
  guestSegment,
}: {
  slug: string;
  guestSegment: string | null;
}) {
  const wedding = await loadWedding(slug);
  if (wedding === null) notFound();
  if (wedding.unavailable) return <InviteUnavailable />;
  const guestName = await guestFrom(wedding, guestSegment);

  return (
    <>
      <InviteGate
        guestName={guestName}
        couple={`${wedding.bride} & ${wedding.groom}`}
        song={wedding.song}
      >
        {/* Full width, not PageShell: the petals run edge to edge, and the
          invite narrows its own text column. */}
        <main className="flex flex-1 flex-col">
          <ShubhVivahInvite
            bride={wedding.bride}
            groom={wedding.groom}
            guestName={guestName}
            weddingDate={wedding.weddingDate}
            ceremonyTime={wedding.ceremonyTime}
            venueName={wedding.venueName}
            venueCity={wedding.venueCity}
            venueMapsUrl={wedding.venueMapsUrl}
            rsvpPhoneE164={wedding.rsvpPhoneE164}
            madeByUrl={madeByUrl(env.rootDomain, env.appUrl)}
            {...(!wedding.sample && {
              editDetailsUrl: editDetailsUrl(wedding.slug, env.rootDomain, env.appUrl),
            })}
            className="flex-1"
          />
        </main>
      </InviteGate>
      {/* The sample is marked like an unpaid preview, so a screenshot of it
          cannot pass for a couple's invite. */}
      {wedding.sample && (
        <>
          <PreviewWatermark label={`${inviteDomainLabel(env.rootDomain)} · sample`} />
          <PreviewShield />
        </>
      )}
    </>
  );
}
