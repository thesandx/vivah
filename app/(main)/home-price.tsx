import { PaperVsDigital } from '@/components/home/PaperVsDigital';
import { formatRupees } from '@/lib/coupons';
import { getPreviewPricing } from '@/services/preview-pricing.service';

/**
 * The price the admin set on `/admin` > Coupons, where the home page names
 * it. Async Server Components, so the home page itself stays synchronous and
 * testable (trap 10). The read is cached for a minute and falls back to the
 * default price after 1.5 seconds.
 */

/** `₹799`, in the hero line. */
export async function HomePrice() {
  const { priceRupees } = await getPreviewPricing();
  return <>{formatRupees(priceRupees)}</>;
}

/** The "paper or digital" table, with the admin's price in its Cost row. */
export async function HomeCompare() {
  const { priceRupees } = await getPreviewPricing();
  return <PaperVsDigital priceRupees={priceRupees} />;
}
