import { SignOutButton } from '@/components/auth/SignOutButton';
import { GuestLinks } from '@/components/dashboard/GuestLinks';
import { WeddingDetailsForm } from '@/components/dashboard/WeddingDetailsForm';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { env } from '@/lib/env';
import { inviteOrigin } from '@/lib/invite-meta';
import { formatPhoneForDisplay } from '@/lib/phone';
import { inviteHostLabel, inviteHref } from '@/lib/site-host';
import { listGuestLinks } from '@/services/guest-link.service';
import type { WeddingDocument } from '@/services/wedding.service';

import { createGuestLinkAction, deleteGuestLinkAction } from './actions';
import { saveWeddingDetailsAction } from './edit/[slug]/actions';

/**
 * A couple's own site in the dashboard: the address, the details (read-only
 * until "Edit details") and the guest links. `/dashboard` shows it for the
 * couple's site; `/dashboard/edit/<slug>` shows it for any other site on the
 * same number.
 *
 * The caller has already checked that the session's phone number owns
 * `wedding`. Every Server Action here checks it again.
 */
export async function CoupleSite({
  wedding,
  phoneE164,
}: {
  wedding: WeddingDocument;
  phoneE164: string;
}) {
  const links = await listGuestLinks(wedding.id);
  const origin = inviteOrigin(wedding.slug, env.rootDomain, env.appUrl);
  const coupleNames = `${wedding.bride} & ${wedding.groom}`;

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-title break-words">{coupleNames}</h1>
          <a
            href={inviteHref(wedding.slug, env.rootDomain)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand decoration-butter font-semibold break-all underline decoration-2 underline-offset-4"
          >
            {inviteHostLabel(wedding.slug, env.rootDomain)}
          </a>
          {wedding.status === 'unavailable' && (
            <Badge tone="brand" className="self-start">
              Paused: guests see &ldquo;not available&rdquo;
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-small text-ink-soft">
            Signed in as{' '}
            <span className="text-ink font-medium">{formatPhoneForDisplay(phoneE164)}</span>
          </p>
          <SignOutButton redirectTo="/" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading">Your details</h2>
            <p className="text-small text-ink-soft">
              Guests see a change as soon as you save. Your web address stays the same, so links you
              already sent keep working.
            </p>
          </div>
          <WeddingDetailsForm
            save={saveWeddingDetailsAction.bind(null, wedding.slug)}
            inviteHref={inviteHref(wedding.slug, env.rootDomain)}
            initial={{
              bride: wedding.bride,
              groom: wedding.groom,
              weddingDate: wedding.weddingDate ?? '',
              ceremonyTime: wedding.ceremonyTime ?? '',
              venueName: wedding.venueName ?? '',
              venueCity: wedding.venueCity ?? '',
              venueMapsUrl: wedding.venueMapsUrl ?? '',
            }}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading">Guest invite links</h2>
            <p className="text-small text-ink-soft">
              Make a link for each guest. It opens your invite with &ldquo;Hi&rdquo; and their name.
            </p>
          </div>
          <GuestLinks
            coupleNames={coupleNames}
            create={createGuestLinkAction.bind(null, wedding.slug)}
            remove={deleteGuestLinkAction.bind(null, wedding.slug)}
            links={links.map((link) => ({
              id: link.id,
              name: link.name,
              url: `${origin}/${link.segment}`,
            }))}
          />
        </Card>
      </div>
    </>
  );
}
