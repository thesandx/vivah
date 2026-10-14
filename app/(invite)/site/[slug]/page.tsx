import type { Metadata } from 'next';

import { CoupleInvite, coupleInviteMetadata } from '@/app/(invite)/site/[slug]/couple-invite';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

/**
 * A couple's invite, served at `<slug>.<root domain>`. `proxy.ts` rewrites
 * the couple's host to this route; nobody types `/site/...` themselves.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return coupleInviteMetadata((await params).slug, null);
}

export default async function InvitePage({ params }: Params) {
  return <CoupleInvite slug={(await params).slug} guestSegment={null} />;
}
