import Link from 'next/link';

import {
  createCouponAction,
  hideRibbonAction,
  savePreviewPricesAction,
  saveRibbonAction,
  turnCheckoutBarOffAction,
  turnCheckoutBarOnAction,
  turnCouponOffAction,
  turnCouponOnAction,
} from '@/app/(admin)/admin/actions';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatAdminTime } from '@/lib/admin-list';
import { coupleNames } from '@/lib/couple-names';
import { discountedPrice, formatRupees, MAX_PERCENT_OFF, usesByCode } from '@/lib/coupons';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { type PreviewPricing, roundedPercentOff } from '@/lib/preview-pricing';
import { inviteHostLabel } from '@/lib/site-host';
import { listAllLeads } from '@/services/admin.service';
import { type CouponDocument, getRibbonCode, listCoupons } from '@/services/coupon.service';
import type { LeadDocument } from '@/services/lead.service';
import { getPreviewPricingForAdmin } from '@/services/preview-pricing.service';

/**
 * The Coupons tab of `/admin` (ADR-0015): set the preview's price and cut
 * price, choose the checkout look, make a code, turn it on or off, see who
 * used it for a referral cashback, and choose the code the home page ribbon
 * shows.
 *
 * Uses are read from the leads: a lead records its code when it is paid,
 * by a payment or by "Make live" on its preview page.
 */

interface Loaded {
  coupons: CouponDocument[];
  uses: Map<string, LeadDocument[]>;
  ribbonCode: string | null;
  pricing: PreviewPricing;
  capped: boolean;
}

async function load(): Promise<Loaded | null> {
  try {
    const [coupons, leads, ribbonCode, pricing] = await Promise.all([
      listCoupons(),
      listAllLeads(),
      getRibbonCode(),
      getPreviewPricingForAdmin(),
    ]);
    return { coupons, uses: usesByCode(leads.items), ribbonCode, pricing, capped: leads.capped };
  } catch (error) {
    logger.error('Loading the coupons failed', error);
    return null;
  }
}

export async function CouponsView() {
  const loaded = await load();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="text-title">Price and coupons</h2>
        <p className="text-ink-soft max-w-prose">
          Set what a couple pays for their preview, and how the pay button looks. A couple types a
          code on the payment sheet of their preview and pays less. Turn a code off to stop it
          working; who used it stays listed.
        </p>
      </header>

      {loaded === null ? (
        <Alert tone="danger" title="The coupons could not be read.">
          Reload the page to try again.
        </Alert>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <PriceCard pricing={loaded.pricing} />
            <CheckoutCard pricing={loaded.pricing} />
          </div>
          <RibbonCard coupons={loaded.coupons} ribbonCode={loaded.ribbonCode} />
          <NewCouponCard priceRupees={loaded.pricing.priceRupees} />
          {loaded.capped && (
            <Alert tone="info" title="Uses count the newest 2,000 previews only." />
          )}
          <CouponList
            coupons={loaded.coupons}
            uses={loaded.uses}
            ribbonCode={loaded.ribbonCode}
            priceRupees={loaded.pricing.priceRupees}
          />
        </>
      )}
    </>
  );
}

function PriceCard({ pricing }: { pricing: PreviewPricing }) {
  const percent = roundedPercentOff(pricing.struckRupees, pricing.priceRupees);
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-heading">Price</h3>
      <p className="text-small text-ink-soft max-w-prose">
        The pay button shows the cut price struck through, the price, and the percentage off,
        rounded to the nearest 10. Payments charge the price, less any coupon. Changes show within a
        minute.
      </p>
      <p className="font-semibold">
        Now: <s className="text-ink-soft font-normal">{formatRupees(pricing.struckRupees)}</s>{' '}
        {formatRupees(pricing.priceRupees)}
        {percent > 0 ? ` · ${percent}% OFF` : ' · no cut price shown'}
      </p>
      <AdminActionForm action={savePreviewPricesAction} label="Save the price" variant="primary">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Price, in ₹"
            name="priceRupees"
            hint="What the couple pays before a coupon."
            inputMode="numeric"
            autoComplete="off"
            defaultValue={String(pricing.priceRupees)}
            required
          />
          <Input
            label="Cut price, in ₹"
            name="struckRupees"
            hint="Struck through beside the price. The same as the price hides it."
            inputMode="numeric"
            autoComplete="off"
            defaultValue={String(pricing.struckRupees)}
            required
          />
        </div>
      </AdminActionForm>
    </Card>
  );
}

function CheckoutCard({ pricing }: { pricing: PreviewPricing }) {
  const on = pricing.checkoutBar;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-heading">Checkout bar</h3>
        <Badge tone={on ? 'success' : 'neutral'}>{on ? 'On' : 'Off'}</Badge>
      </div>
      <p className="text-small text-ink-soft max-w-prose">
        On: the preview shows a fixed bar at the foot, like a shopping site, with the price and one
        “Buy at {formatRupees(pricing.priceRupees)}” button. It does not drag or grow. Off: the
        drag-up pay sheet. Couples can type a coupon code only on the sheet.
      </p>
      <AdminActionForm
        action={on ? turnCheckoutBarOffAction : turnCheckoutBarOnAction}
        label={on ? 'Use the drag-up sheet' : 'Use the fixed bar'}
        variant={on ? 'secondary' : 'primary'}
      />
    </Card>
  );
}

function RibbonCard({
  coupons,
  ribbonCode,
}: {
  coupons: readonly CouponDocument[];
  ribbonCode: string | null;
}) {
  const active = coupons.filter((coupon) => coupon.active);
  const current = coupons.find((coupon) => coupon.code === ribbonCode) ?? null;
  const showing = current !== null && current.active;

  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-heading">Home page ribbon</h3>
      <p className="text-small text-ink-soft max-w-prose">
        A band at the top of the home page: “Use code NEW20 and get 20% off”. The payment sheet
        offers the same code in one tap. Changes show within a minute.
      </p>
      <p className="font-semibold">
        {showing
          ? `Showing ${current.code}: ${current.percentOff}% off.`
          : current !== null
            ? `Hidden: ${current.code} is turned off.`
            : 'Hidden.'}
      </p>
      {active.length === 0 ? (
        <p className="text-small text-ink-soft">Make a coupon below to show it here.</p>
      ) : (
        <AdminActionForm action={saveRibbonAction} label="Show on the home page" variant="primary">
          <Select
            label="Coupon"
            name="coupon"
            defaultValue={showing ? current.code : (active[0]?.code ?? '')}
            options={active.map((coupon) => ({
              value: coupon.code,
              label: `${coupon.code} · ${coupon.percentOff}% off`,
            }))}
          />
        </AdminActionForm>
      )}
      {showing && <AdminActionForm action={hideRibbonAction} label="Hide the ribbon" />}
    </Card>
  );
}

function NewCouponCard({ priceRupees }: { priceRupees: number }) {
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-heading">New coupon</h3>
      <AdminActionForm action={createCouponAction} label="Make the coupon" variant="primary">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Code"
            name="code"
            hint="Capital letters and digits, such as NEW20 or RIYA10."
            autoComplete="off"
            maxLength={20}
            required
            code
          />
          <Input
            label="Discount, in %"
            name="percentOff"
            hint={`From 1 to ${MAX_PERCENT_OFF}. 20 makes ${formatRupees(priceRupees)} into ${formatRupees(discountedPrice(priceRupees, 20))}.`}
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </div>
        <Input
          label="Note (optional)"
          name="note"
          hint="Whose code it is, for a referral cashback. Only you see it."
          autoComplete="off"
          maxLength={120}
        />
      </AdminActionForm>
    </Card>
  );
}

function CouponList({
  coupons,
  uses,
  ribbonCode,
  priceRupees,
}: {
  coupons: readonly CouponDocument[];
  uses: Map<string, LeadDocument[]>;
  ribbonCode: string | null;
  priceRupees: number;
}) {
  if (coupons.length === 0) {
    return (
      <EmptyState title="No coupons yet">Make one above, such as NEW20 for 20% off.</EmptyState>
    );
  }
  return (
    <ul className="grid gap-6 lg:grid-cols-2">
      {coupons.map((coupon) => {
        const used = uses.get(coupon.code) ?? [];
        return (
          <li key={coupon.id}>
            <Card as="div" className="flex h-full flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-title tracking-wide break-all">{coupon.code}</h3>
                <span className="flex flex-wrap gap-2">
                  {coupon.code === ribbonCode && coupon.active && (
                    <Badge tone="brand">On the ribbon</Badge>
                  )}
                  <Badge tone={coupon.active ? 'success' : 'neutral'}>
                    {coupon.active ? 'On' : 'Off'}
                  </Badge>
                </span>
              </div>
              <p>
                {coupon.percentOff}% off: the couple pays{' '}
                <span className="font-semibold">
                  {formatRupees(discountedPrice(priceRupees, coupon.percentOff))}
                </span>
                .
              </p>
              {coupon.note !== '' && <p className="text-small text-ink-soft">{coupon.note}</p>}
              <p className="text-small text-ink-soft">Made {formatAdminTime(coupon.createdAt)}</p>

              <section aria-label={`Who used ${coupon.code}`} className="flex flex-col gap-2">
                <h4 className="font-semibold">
                  {used.length === 0
                    ? 'Not used yet'
                    : `Used ${used.length} ${used.length === 1 ? 'time' : 'times'}`}
                </h4>
                {used.length > 0 && (
                  <ol className="border-line divide-line rounded-card flex flex-col divide-y-2 border-2">
                    {used.map((lead) => (
                      <li key={lead.id}>
                        <Link
                          href={`/admin/previews/${lead.id}`}
                          className="hover:bg-sunken flex flex-col gap-0.5 p-3"
                        >
                          <span className="font-semibold break-words">{coupleNames(lead)}</span>
                          <span className="text-small text-ink-soft break-all">
                            {lead.weddingSlug === undefined
                              ? 'Paid, choosing an address'
                              : inviteHostLabel(lead.weddingSlug, env.rootDomain)}
                            {' · '}
                            {formatAdminTime(lead.paidAt ?? lead.updatedAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <AdminActionForm
                className="mt-auto"
                action={(coupon.active ? turnCouponOffAction : turnCouponOnAction).bind(
                  null,
                  coupon.id,
                )}
                label={coupon.active ? 'Turn off' : 'Turn on'}
                {...(coupon.active && {
                  confirm: {
                    title: `Turn ${coupon.code} off?`,
                    body: 'Couples can no longer use it, and the home page ribbon hides it. Who used it stays listed. You can turn it on again.',
                    confirmLabel: 'Turn it off',
                  },
                })}
              />
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
