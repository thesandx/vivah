import Link from 'next/link';

import {
  createCouponAction,
  hideRibbonAction,
  saveRibbonAction,
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
import { PRICE_FROM_RUPEES } from '@/lib/business';
import { coupleNames } from '@/lib/couple-names';
import { discountedPrice, formatRupees, MAX_PERCENT_OFF, usesByCode } from '@/lib/coupons';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { inviteHostLabel } from '@/lib/site-host';
import { listAllLeads } from '@/services/admin.service';
import { type CouponDocument, getRibbonCode, listCoupons } from '@/services/coupon.service';
import type { LeadDocument } from '@/services/lead.service';

/**
 * The Coupons tab of `/admin` (ADR-0015): make a code, turn it on or off,
 * see who used it for a referral cashback, and choose the code the home page
 * ribbon shows.
 *
 * Uses are read from the leads: a lead records its code when it is paid,
 * by a payment or by "Make live" on its preview page.
 */

interface Loaded {
  coupons: CouponDocument[];
  uses: Map<string, LeadDocument[]>;
  ribbonCode: string | null;
  capped: boolean;
}

async function load(): Promise<Loaded | null> {
  try {
    const [coupons, leads, ribbonCode] = await Promise.all([
      listCoupons(),
      listAllLeads(),
      getRibbonCode(),
    ]);
    return { coupons, uses: usesByCode(leads.items), ribbonCode, capped: leads.capped };
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
        <h2 className="text-title">Coupons</h2>
        <p className="text-ink-soft max-w-prose">
          The price is {formatRupees(PRICE_FROM_RUPEES)}. A couple types a code on the payment sheet
          of their preview and pays less. Turn a code off to stop it working; who used it stays
          listed.
        </p>
      </header>

      {loaded === null ? (
        <Alert tone="danger" title="The coupons could not be read.">
          Reload the page to try again.
        </Alert>
      ) : (
        <>
          <RibbonCard coupons={loaded.coupons} ribbonCode={loaded.ribbonCode} />
          <NewCouponCard />
          {loaded.capped && (
            <Alert tone="info" title="Uses count the newest 2,000 previews only." />
          )}
          <CouponList coupons={loaded.coupons} uses={loaded.uses} ribbonCode={loaded.ribbonCode} />
        </>
      )}
    </>
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

function NewCouponCard() {
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
            hint={`From 1 to ${MAX_PERCENT_OFF}. 20 makes ${formatRupees(PRICE_FROM_RUPEES)} into ${formatRupees(discountedPrice(PRICE_FROM_RUPEES, 20))}.`}
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
}: {
  coupons: readonly CouponDocument[];
  uses: Map<string, LeadDocument[]>;
  ribbonCode: string | null;
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
                  {formatRupees(discountedPrice(PRICE_FROM_RUPEES, coupon.percentOff))}
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
