import { OfferRibbon } from '@/components/home/OfferRibbon';
import { getHomeRibbon } from '@/services/coupon.service';

/**
 * The coupon ribbon at the top of the home page, when the admin has turned
 * it on and its coupon works (ADR-0015). An async Server Component, so the
 * home page itself stays synchronous and testable (trap 10).
 */
export async function HomeRibbon({ href }: { href: string }) {
  const ribbon = await getHomeRibbon();
  if (ribbon === null) return null;
  return <OfferRibbon code={ribbon.code} percentOff={ribbon.percentOff} href={href} />;
}
