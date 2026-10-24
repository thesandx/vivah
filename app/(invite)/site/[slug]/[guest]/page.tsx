import type { Metadata } from 'next';

import { CoupleInvite, coupleInviteMetadata } from '@/app/(invite)/site/[slug]/couple-invite';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string; guest: string }> };

/**
 * A guest's own link: `sara.vivah.online/Neha` greets "Hi Neha" on
 * the envelope and in the WhatsApp preview. `proxy.ts` rewrites it here.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, guest } = await params;
  return coupleInviteMetadata(slug, guest);
}

export default async function GuestInvitePage({ params }: Params) {
  const { slug, guest } = await params;
  return <CoupleInvite slug={slug} guestSegment={guest} />;
}
