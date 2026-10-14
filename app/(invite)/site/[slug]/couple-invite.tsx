import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { Envelope } from '@/components/invite/Envelope';
import { ShubhVivahInvite } from '@/components/invite/ShubhVivahInvite';
import { PageShell } from '@/components/layout/PageShell';
import { env } from '@/lib/env';
import { coupleInitials, parseGuestName } from '@/lib/guest-name';
import { inviteMetadata } from '@/lib/invite-meta';
import { getWeddingBySlug } from '@/services/wedding.service';

/**
 * The couple's invite, shared by the plain link (`sara.vivah.online`) and a
 * guest's link (`sara.vivah.online/Kartheek`). The two routes differ only in
 * the guest name, so both render through here.
 */

/** One Firestore read per request, shared by the metadata and the page. */
const loadWedding = cache(getWeddingBySlug);

/** The guest name from the path, or `null` for no segment or an unusable one. */
function guestFrom(segment: string | null): string | null {
  return segment === null ? null : parseGuestName(segment);
}

export async function coupleInviteMetadata(
  slug: string,
  guestSegment: string | null,
): Promise<Metadata> {
  const wedding = await loadWedding(slug);
  if (wedding === null) return { title: 'Invite not found', robots: { index: false } };

  return inviteMetadata({
    slug: wedding.slug,
    bride: wedding.bride,
    groom: wedding.groom,
    weddingDate: wedding.weddingDate,
    guestName: guestFrom(guestSegment),
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
  const guestName = guestFrom(guestSegment);

  return (
    <Envelope
      guestName={guestName}
      initials={coupleInitials(wedding.bride, wedding.groom)}
      rememberKey={`vivah:opened:${wedding.slug}:${guestName ?? ''}`}
    >
      <PageShell className="flex-1 justify-center">
        <ShubhVivahInvite
          bride={wedding.bride}
          groom={wedding.groom}
          weddingDate={wedding.weddingDate}
          guestName={guestName}
        />
      </PageShell>
    </Envelope>
  );
}
