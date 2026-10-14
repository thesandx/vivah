import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { InviteCard } from '@/components/invite/InviteCard';
import { PageShell } from '@/components/layout/PageShell';
import { formatWeddingDate } from '@/lib/wedding-date';
import { getWeddingBySlug } from '@/services/wedding.service';

export const dynamic = 'force-dynamic';

/** One Firestore read per request, shared by the metadata and the page. */
const loadWedding = cache(getWeddingBySlug);

/**
 * The invite's title and description are what WhatsApp shows in the link
 * preview, so they carry the couple's names and day.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const wedding = await loadWedding((await params).slug);
  if (wedding === null) return { title: 'Invite not found', robots: { index: false } };

  const names = `${wedding.bride} and ${wedding.groom}`;
  return {
    title: { absolute: `${names} are getting married` },
    description:
      wedding.weddingDate === null
        ? `You are invited to the wedding of ${names}.`
        : `You are invited to the wedding of ${names} on ${formatWeddingDate(wedding.weddingDate)}.`,
  };
}

/**
 * A couple's invite, served at `<slug>.<root domain>`. `proxy.ts` rewrites
 * the couple's host to this route; nobody types `/site/...` themselves.
 */
export default async function InvitePage({ params }: { params: Promise<{ slug: string }> }) {
  const wedding = await loadWedding((await params).slug);
  if (wedding === null) notFound();

  return (
    <PageShell>
      <InviteCard bride={wedding.bride} groom={wedding.groom} weddingDate={wedding.weddingDate} />
    </PageShell>
  );
}
