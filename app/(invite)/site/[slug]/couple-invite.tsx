import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { Envelope } from '@/components/invite/Envelope';
import { InviteUnavailable } from '@/components/invite/InviteUnavailable';
import { ShubhVivahInvite } from '@/components/invite/ShubhVivahInvite';
import { env } from '@/lib/env';
import { coupleInitials, parseGuestName } from '@/lib/guest-name';
import { inviteMetadata } from '@/lib/invite-meta';
import { madeByUrl } from '@/lib/site-host';
import { songUrl } from '@/lib/wedding-songs';
import { isGuestLinkDeleted } from '@/services/guest-link.service';
import { getWeddingBySlug, type WeddingDocument } from '@/services/wedding.service';

/**
 * The couple's invite, shared by the plain link (`sara.vivah.online`) and a
 * guest's link (`sara.vivah.online/Kartheek`). The two routes differ only in
 * the guest name, so both render through here.
 */

/** One Firestore read per request, shared by the metadata and the page. */
const loadWedding = cache(getWeddingBySlug);

/** One guest-link read per request, shared by the metadata and the page. */
const loadDeleted = cache(isGuestLinkDeleted);

/**
 * The guest name from the path, or `null` for no segment, an unusable one, or
 * a link the couple deleted in the dashboard. A deleted link shows the
 * couple's general invite, not an error.
 */
async function guestFrom(wedding: WeddingDocument, segment: string | null): Promise<string | null> {
  if (segment === null) return null;
  const name = parseGuestName(segment);
  if (name === null) return null;
  return (await loadDeleted(wedding.id, segment)) ? null : name;
}

export async function coupleInviteMetadata(
  slug: string,
  guestSegment: string | null,
): Promise<Metadata> {
  const wedding = await loadWedding(slug);
  if (wedding === null) return { title: 'Invite not found', robots: { index: false } };
  if (wedding.status === 'unavailable') {
    return { title: 'Invite not available', robots: { index: false } };
  }

  const guestName = await guestFrom(wedding, guestSegment);
  return inviteMetadata({
    slug: wedding.slug,
    bride: wedding.bride,
    groom: wedding.groom,
    weddingDate: wedding.weddingDate,
    guestName,
    ...(guestName !== null && guestSegment !== null && { guestSegment }),
    rootDomain: env.rootDomain,
    appUrl: env.appUrl,
  });
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
  if (wedding.status === 'unavailable') return <InviteUnavailable />;
  const guestName = await guestFrom(wedding, guestSegment);

  return (
    <Envelope
      guestName={guestName}
      initials={coupleInitials(wedding.bride, wedding.groom)}
      couple={`${wedding.bride} & ${wedding.groom}`}
      rememberKey={`vivah:opened:${wedding.slug}:${guestName ?? ''}`}
      song={
        wedding.song === undefined
          ? null
          : { name: wedding.song.name, src: songUrl(wedding.song.file) }
      }
    >
      {/* Full width, not PageShell: the petals run edge to edge, and the
          invite narrows its own text column. */}
      <main className="flex flex-1 flex-col">
        <ShubhVivahInvite
          bride={wedding.bride}
          groom={wedding.groom}
          guestName={guestName}
          weddingDate={wedding.weddingDate}
          ceremonyTime={wedding.ceremonyTime ?? null}
          venueName={wedding.venueName ?? null}
          venueCity={wedding.venueCity ?? null}
          venueMapsUrl={wedding.venueMapsUrl ?? null}
          rsvpPhoneE164={wedding.ownerPhoneE164}
          madeByUrl={madeByUrl(env.rootDomain, env.appUrl)}
          className="flex-1"
        />
      </main>
    </Envelope>
  );
}
