import 'server-only';

import { formatRupees } from '@/lib/coupons';
import { SITE_CONTENT_COLLECTION } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import {
  DEFAULT_PREVIEW_PRICING,
  PREVIEW_PRICING_DOC_ID,
  previewPricesSchema,
  type PreviewPricing,
  previewPricingSchema,
} from '@/lib/preview-pricing';
import { withTimeout } from '@/lib/utils';
import type { AdminResult } from '@/services/admin.service';
import { recordAdminActionIn } from '@/services/admin-audit.service';
import { createRepository } from '@/services/repository';

/**
 * The preview's price, cut price and checkout look (`lib/preview-pricing.ts`),
 * which the admin changes from `/admin` > Coupons without a deploy.
 *
 * One document, `siteContent/preview-pricing`. The id is fixed because every
 * preview and every payment reads it by key; an admin writes it a few times
 * a month, so it is never a hotspot.
 *
 * Two reads. A page (`getPreviewPricing`) falls back to the defaults when the
 * read fails, so it never breaks. A payment (`getPreviewPricingToCharge`)
 * throws instead: charging the default while the page showed the admin's
 * price would charge a price the couple did not see.
 */

const previewPricing = createRepository({
  collection: SITE_CONTENT_COLLECTION,
  schema: previewPricingSchema,
});

/** The id is fixed and short on purpose; see the module comment. */
const ID_OPTIONS = { minLength: PREVIEW_PRICING_DOC_ID.length };

/** One instance reads the document at most once a minute. */
const CACHE_MS = 60 * 1000;

/** A page waits this long for the price, then uses the default. */
const READ_TIMEOUT_MS = 1500;

let cached: { at: number; pricing: PreviewPricing } | null = null;

/** Forgets the cached pricing on this instance. For tests, and after a change. */
export function resetPreviewPricingCache(): void {
  cached = null;
}

async function readPricing(): Promise<PreviewPricing> {
  const document = await withTimeout(
    previewPricing.get(PREVIEW_PRICING_DOC_ID),
    READ_TIMEOUT_MS,
    'Reading the preview price',
  );
  const pricing =
    document === null
      ? DEFAULT_PREVIEW_PRICING
      : previewPricingSchema.parse({
          priceRupees: document.priceRupees,
          struckRupees: document.struckRupees,
          checkoutBar: document.checkoutBar,
        });
  cached = { at: Date.now(), pricing };
  return pricing;
}

function fresh(): PreviewPricing | null {
  return cached !== null && Date.now() - cached.at < CACHE_MS ? cached.pricing : null;
}

/** For a page. Cached for a minute. A failed read uses the defaults and is logged. */
export async function getPreviewPricing(): Promise<PreviewPricing> {
  const hit = fresh();
  if (hit !== null) return hit;
  try {
    return await readPricing();
  } catch (error) {
    logger.warn('The preview price could not be read', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return DEFAULT_PREVIEW_PRICING;
  }
}

/** For a payment. Cached for a minute. A failed read throws; see the module comment. */
export async function getPreviewPricingToCharge(): Promise<PreviewPricing> {
  return fresh() ?? readPricing();
}

/** The saved pricing, uncached, for `/admin`. A failed read throws. */
export async function getPreviewPricingForAdmin(): Promise<PreviewPricing> {
  return readPricing();
}

/** Writes `change` over the current pricing, with its audit entry, in one transaction. */
async function writePricing(
  change: Partial<PreviewPricing>,
  adminUid: string,
  audit: { action: 'preview-price-changed' | 'checkout-bar-changed'; detail: string },
): Promise<void> {
  await previewPricing.runTransaction(async (repo, tx) => {
    if ((await repo.get(PREVIEW_PRICING_DOC_ID)) === null) {
      repo.createWithId(
        PREVIEW_PRICING_DOC_ID,
        { ...DEFAULT_PREVIEW_PRICING, ...change },
        ID_OPTIONS,
      );
    } else {
      repo.update(PREVIEW_PRICING_DOC_ID, change);
    }
    recordAdminActionIn(tx, {
      action: audit.action,
      targetType: 'site',
      targetId: PREVIEW_PRICING_DOC_ID,
      detail: audit.detail,
      adminUid,
    });
  });
  resetPreviewPricingCache();
}

/** Saves the price and the cut price. Only `/admin` calls this, after `requireAdmin()`. */
export async function savePreviewPrices(raw: unknown, adminUid: string): Promise<AdminResult> {
  const parsed = previewPricesSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the prices.' };
  }
  const { priceRupees, struckRupees } = parsed.data;
  const words = `${formatRupees(priceRupees)}, cut price ${formatRupees(struckRupees)}`;
  await writePricing({ priceRupees, struckRupees }, adminUid, {
    action: 'preview-price-changed',
    detail: `Set the preview price to ${words}.`,
  });
  return {
    ok: true,
    message: `Saved: ${words}. Previews and payments use it within a minute.`,
  };
}

/** Turns the fixed "Buy at" checkout bar on or off. */
export async function setCheckoutBar(on: boolean, adminUid: string): Promise<AdminResult> {
  await writePricing({ checkoutBar: on }, adminUid, {
    action: 'checkout-bar-changed',
    detail: on
      ? 'Turned on the fixed "Buy at" checkout bar on previews.'
      : 'Put back the drag-up pay sheet on previews.',
  });
  return {
    ok: true,
    message: on
      ? 'Previews show the fixed "Buy at" bar within a minute.'
      : 'Previews show the drag-up sheet again within a minute.',
  };
}
