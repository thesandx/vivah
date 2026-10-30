import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  changePreviewFunctionsAction,
  changePreviewNameOrderAction,
  changePreviewSongAction,
  deleteLeadAction,
  makePreviewLiveAction,
  reactivatePreviewAction,
  restoreLeadAction,
  setLeadTagAction,
} from '@/app/(admin)/admin/actions';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
import { AdminSignInScreen } from '@/components/admin/AdminSignInScreen';
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton';
import { CopyButton } from '@/components/admin/CopyButton';
import { PreviewActivityCard } from '@/components/admin/PreviewActivityCard';
import { StateBadge } from '@/components/admin/StateBadge';
import { TagBadge } from '@/components/admin/TagBadge';
import { SongPicker } from '@/components/dashboard/SongPicker';
import { AppBar } from '@/components/layout/AppBar';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { ContactLink } from '@/components/ui/ContactLink';
import { Input } from '@/components/ui/Input';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { formatAdminTime, leadState, previewTimeNote } from '@/lib/admin-list';
import { whatsAppChatUrl } from '@/lib/business';
import { coupleNames, NAME_ORDER_LABELS, NAME_ORDERS } from '@/lib/couple-names';
import { env } from '@/lib/env';
import {
  HOT_AFTER_MINUTES,
  HOT_UNTIL_HOURS,
  hotFollowUpMessage,
  hotLabel,
  hotStatus,
} from '@/lib/hot-follow-up';
import { LEAD_TAG_HINTS, LEAD_TAG_LABELS, LEAD_TAGS, leadTag } from '@/lib/lead-tags';
import { logger } from '@/lib/logger';
import { formatPhoneForDisplay } from '@/lib/phone';
import {
  NUDGE_DAYS,
  NUDGE_TOPICS,
  nudgeLabel,
  nudgeMessage,
  nudgeStatus,
  openAgainMessage,
} from '@/lib/preview-nudges';
import { buildPreviewActivity, type PreviewActivity } from '@/lib/preview-report';
import { siteOrigin } from '@/lib/seo';
import { inviteHostLabel } from '@/lib/site-host';
import { formatWeddingDate } from '@/lib/wedding-date';
import { FESTIVITY_LABELS, FUNCTION_KINDS } from '@/lib/wedding-functions';
import { type SongOption, songUrl } from '@/lib/wedding-songs';
import { welcomeMessage } from '@/lib/welcome-message';
import { getLeadForAdmin } from '@/services/admin.service';
import { getAdminSession } from '@/services/admin-session.service';
import type { LeadDocument } from '@/services/lead.service';
import { previewBeaconsFor } from '@/services/preview-beacon.service';
import { checkSlug, freeSlugSuggestions, getWeddingBySlug } from '@/services/wedding.service';
import { listSongOptions } from '@/services/wedding-songs.service';

/**
 * `GET /admin/previews/<lead id>` — one preview: who asked, when it expires,
 * and the buttons to reactivate it, send it again, make it live without a
 * payment, delete or restore it.
 */

export const metadata: Metadata = {
  title: 'Admin: preview',
  description: 'Reactivate, resend, make live or delete one invite preview.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  if (!env.adminEnabled) notFound();
  const session = await getAdminSession();
  if (session === null) return <AdminSignInScreen />;

  const { id } = await params;
  const lead = await getLeadForAdmin(id);
  if (lead === null) notFound();

  const now = new Date();
  const state = leadState(lead, now);
  const canMakeLive = lead.deletedAt === null && lead.weddingSlug === undefined;
  const [wedding, songs, liveSuggestion, activity] = await Promise.all([
    lead.weddingSlug === undefined ? null : getWeddingBySlug(lead.weddingSlug),
    songOptions(),
    canMakeLive ? addressSuggestion(lead) : '',
    previewActivity(lead.id),
  ]);
  const tag = leadTag(lead);
  const currentSong = lead.song ?? null;
  const currentSlot =
    currentSong === null
      ? null
      : (songs.find((option) => option.src === songUrl(currentSong.file))?.slot ?? null);
  // Once paid, the couple may change the order in their dashboard: the live
  // invite's order wins, so every message matches what guests see.
  const nameOrder = wedding?.nameOrder ?? lead.nameOrder;
  const couple = { bride: lead.bride, groom: lead.groom, nameOrder };
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  const link = `${origin}/p/${lead.id}`;
  const welcome =
    wedding === null
      ? null
      : welcomeMessage({
          bride: lead.bride,
          groom: lead.groom,
          nameOrder,
          slug: wedding.slug,
          phoneE164: lead.phoneE164,
          origin,
        });
  // The link goes last: WhatsApp on Android shows no link preview for a
  // typed-in message whose link is followed by more text.
  const message = `Hi ${coupleNames(couple)}, here is your wedding invite preview. It stays open for 30 minutes from when you open it, so please complete payment within that time.\n\n${link}`;
  const openAgain = openAgainMessage({
    bride: lead.bride,
    groom: lead.groom,
    nameOrder,
    link,
  });
  const hot = hotStatus(lead, now);
  const hotText = hotFollowUpMessage({ ...couple, link });
  const nudge = nudgeStatus(lead, now);
  const nudgeInput = {
    bride: lead.bride,
    groom: lead.groom,
    nameOrder,
    rootDomain: env.rootDomain,
  };
  const nudgeText = nudge.kind === 'due' ? nudgeMessage(nudge.day, nudgeInput) : null;

  return (
    <>
      <AppBar
        title={coupleNames(couple)}
        back={{ fallbackHref: '/admin?view=previews', label: 'Back to all previews' }}
        end={<AdminSignOutButton />}
      />
      <main className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-6 sm:px-8 sm:py-10 lg:grid-cols-3 lg:items-start lg:gap-10">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-8">
          <div className="flex flex-wrap gap-2">
            <StateBadge state={state} />
            <TagBadge tag={tag} />
          </div>
          <dl className="text-small grid gap-2">
            <div>
              <dt className="text-ink-soft">Couple&apos;s WhatsApp</dt>
              <dd>
                <ContactLink kind="phone" value={formatPhoneForDisplay(lead.phoneE164)} />
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Wedding date</dt>
              <dd>
                {lead.weddingDate === null ? 'Not given' : formatWeddingDate(lead.weddingDate)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Asked</dt>
              <dd>{formatAdminTime(lead.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">First opened</dt>
              <dd>
                {lead.firstOpenedAt === null ? 'Not yet' : formatAdminTime(lead.firstOpenedAt)}
              </dd>
            </div>
            {lead.coupon !== undefined && (
              <div>
                <dt className="text-ink-soft">Coupon</dt>
                <dd>
                  <Link
                    href="/admin?view=coupons"
                    className="text-brand font-semibold underline underline-offset-4"
                  >
                    {lead.coupon.code}
                  </Link>{' '}
                  · {lead.coupon.percentOff}% off
                </dd>
              </div>
            )}
            {lead.status !== 'paid' && (
              <div>
                <dt className="text-ink-soft">30-minute timer</dt>
                <dd>
                  {state === 'expired'
                    ? `Closed ${formatAdminTime(lead.viewEndsAt ?? lead.expiresAt)}`
                    : previewTimeNote(lead, now)}
                </dd>
              </div>
            )}
          </dl>
          <Card as="div" className="flex flex-col gap-3">
            <h2 className="text-heading">Tag</h2>
            <p className="text-small text-ink-soft">
              {LEAD_TAG_LABELS[tag]}: {LEAD_TAG_HINTS[tag]}
            </p>
            <div className="flex flex-wrap gap-3">
              {LEAD_TAGS.filter((other) => other !== tag).map((other) => (
                <AdminActionForm
                  key={other}
                  action={setLeadTagAction.bind(null, lead.id, other)}
                  label={`Mark ${LEAD_TAG_LABELS[other]}`}
                />
              ))}
            </div>
          </Card>
          {wedding !== null && (
            <Link
              href={`/admin/invites/${wedding.id}`}
              className={buttonStyles({ variant: 'secondary' })}
            >
              Open the paid invite
            </Link>
          )}
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <PreviewActivityCard activity={activity} />

          {state !== 'paid' && state !== 'deleted' && (
            <>
              <Card className="flex flex-col gap-4">
                <h2 className="text-heading">10-minute follow-up</h2>
                <p className="text-small text-ink-soft">
                  One message if the couple has not paid {HOT_AFTER_MINUTES} minutes after the
                  preview. It offers help, and asks why if they will not buy. The daily nudges start
                  the next day.
                </p>
                <p className="font-semibold">
                  {hot.kind === 'hot'
                    ? hotLabel(hot)
                    : hot.kind === 'soon'
                      ? `Due in ${hot.minutesLeft} min if still not paid`
                      : `More than ${HOT_UNTIL_HOURS} hours since the preview. You can still send it.`}
                </p>
                <p className="text-small text-ink-soft whitespace-pre-line break-words">
                  {hotText}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={whatsAppChatUrl(lead.phoneE164, hotText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({
                      variant: hot.kind === 'hot' ? 'primary' : 'secondary',
                    })}
                  >
                    Send follow-up
                  </a>
                  <CopyButton value={hotText} label="Copy message" />
                </div>
              </Card>

              <Card className="flex flex-col gap-4">
                <h2 className="text-heading">Send the preview again</h2>
                <p className="text-small text-ink-soft">
                  WhatsApp sending is not automatic yet. Copy the link, or open WhatsApp with the
                  message typed in for you.
                  {state === 'expired' && ' Reactivate it first: the preview has closed.'}
                </p>
                <p className="text-small text-ink-soft break-all">{link}</p>
                <div className="flex flex-wrap gap-3">
                  <CopyButton value={link} />
                  <a
                    href={whatsAppChatUrl(lead.phoneE164, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({ variant: 'primary' })}
                  >
                    Send on WhatsApp
                  </a>
                  <a
                    href={whatsAppChatUrl(lead.phoneE164, openAgain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({ variant: 'secondary' })}
                  >
                    Send &ldquo;open again&rdquo;
                  </a>
                  <CopyButton value={openAgain} label="Copy “open again”" />
                </div>
                <p className="text-small text-ink-soft">
                  Use &ldquo;open again&rdquo; after you reactivate a preview the couple asked to
                  open.
                </p>
              </Card>

              <Card className="flex flex-col gap-4">
                <h2 className="text-heading">Daily nudge</h2>
                <p className="text-small text-ink-soft">
                  One WhatsApp message a day for {NUDGE_DAYS} days after the preview, until the
                  couple pays. Stop if they say no.
                </p>
                {nudge.kind === 'due' && nudgeText !== null ? (
                  <>
                    <p className="font-semibold">
                      {nudgeLabel(nudge)}: {NUDGE_TOPICS[nudge.day - 1]}
                    </p>
                    <p className="text-small text-ink-soft whitespace-pre-line break-words">
                      {nudgeText}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={whatsAppChatUrl(lead.phoneE164, nudgeText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonStyles({ variant: 'primary' })}
                      >
                        Send Day {nudge.day} nudge
                      </a>
                      <CopyButton value={nudgeText} label="Copy message" />
                    </div>
                  </>
                ) : (
                  <p>{nudgeLabel(nudge) ?? 'No nudge: the wedding day has passed.'}</p>
                )}
                <details className="border-line rounded-card border-2">
                  <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 font-semibold">
                    All {NUDGE_DAYS} messages
                  </summary>
                  <ol className="divide-line flex flex-col divide-y-2 border-line border-t-2">
                    {NUDGE_TOPICS.map((topic, index) => {
                      const day = index + 1;
                      const text = nudgeMessage(day, nudgeInput);
                      return (
                        <li key={topic} className="flex flex-col gap-3 p-4">
                          <p className="font-semibold">
                            Day {day}: {topic}
                          </p>
                          <p className="text-small text-ink-soft whitespace-pre-line break-words">
                            {text}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <a
                              href={whatsAppChatUrl(lead.phoneE164, text)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonStyles({ variant: 'secondary' })}
                            >
                              Send Day {day}
                            </a>
                            <CopyButton value={text} label="Copy message" />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              </Card>

              <Card className="flex flex-col gap-4">
                <h2 className="text-heading">Reactivate</h2>
                <p className="text-small text-ink-soft">
                  Gives the couple a fresh 30 minutes. The timer starts again when the link is next
                  opened. The next two phones to open it can pay and publish.
                </p>
                <AdminActionForm
                  action={reactivatePreviewAction.bind(null, lead.id)}
                  label="Reactivate preview"
                  variant="primary"
                  {...(state === 'opened' && {
                    confirm: {
                      title: 'Reactivate this preview?',
                      body: 'Its timer stops and starts again from 30:00 on the next open. The phones that opened it must tap the link again to pay.',
                      confirmLabel: 'Reactivate',
                    },
                  })}
                />
              </Card>
            </>
          )}

          {welcome !== null && wedding !== null && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-heading">Welcome message</h2>
              <p className="text-small text-ink-soft">
                The invite is live at {inviteHostLabel(wedding.slug, env.rootDomain)}. Send the
                couple their link, their dashboard sign-in and the help page.
              </p>
              <details className="border-line rounded-card border-2">
                <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 font-semibold">
                  Read the message
                </summary>
                <p className="text-small text-ink-soft border-line border-t-2 p-4 whitespace-pre-line break-words">
                  {welcome}
                </p>
              </details>
              <div className="flex flex-wrap gap-3">
                <a
                  href={whatsAppChatUrl(lead.phoneE164, welcome)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({ variant: 'primary' })}
                >
                  Send welcome on WhatsApp
                </a>
                <CopyButton value={welcome} label="Copy message" />
              </div>
            </Card>
          )}

          {canMakeLive && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-heading">Make live without payment</h2>
              <p className="text-small text-ink-soft">
                For a couple who paid another way, such as UPI to the business number, or who gets
                the invite free. The invite goes live at this address now, with no watermark and no
                timer, exactly as after a payment. No payment is recorded. If they used a coupon
                code, type it, so the referral counts in Coupons.
              </p>
              <AdminActionForm
                action={makePreviewLiveAction.bind(null, lead.id)}
                label="Make live"
                variant="primary"
                field={{
                  name: 'slug',
                  label: 'Address',
                  defaultValue: liveSuggestion,
                  hint: `Lowercase letters, digits and hyphens. Becomes <address>.${env.rootDomain || 'vivah.online'}.`,
                }}

                confirm={{
                  title: `Make ${coupleNames(couple)} live?`,
                  body: 'The invite goes live at the address you typed, with no payment. Guests can open it at once. To undo it, delete the invite from Invites.',
                  confirmLabel: 'Make live',
                }}
              >
                <Input
                  label="Coupon code (optional)"
                  name="coupon"
                  hint="Leave it empty when they used no code."
                  autoComplete="off"
                  code
                />
              </AdminActionForm>
            </Card>
          )}

          {lead.deletedAt === null && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-heading">Name order</h2>
              <p className="text-small text-ink-soft">
                Whose name the invite shows first. The address stays the same.
                {wedding !== null && ' The couple has paid, so the live invite changes too.'}
                {currentSong === null &&
                  songs[0] !== undefined &&
                  ` None chosen yet, so it plays ${songs[0].name}, the first song on the list.`}
              </p>
              <AdminActionForm
                action={changePreviewNameOrderAction.bind(null, lead.id)}
                label="Save name order"
              >
                <RadioGroup
                  label="Show first"
                  name="nameOrder"
                  options={NAME_ORDERS.map((order) => ({
                    value: order,
                    label: `${NAME_ORDER_LABELS[order]}: ${coupleNames({ ...couple, nameOrder: order })}`,
                  }))}
                  defaultValue={nameOrder ?? 'bride-first'}
                />
              </AdminActionForm>
            </Card>
          )}

          {lead.deletedAt === null && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-heading">Functions</h2>
              <p className="text-small text-ink-soft">
                {wedding !== null
                  ? 'The couple has paid. Edit the live invite’s functions, with their dates and venues, on the invite’s page.'
                  : 'The functions the preview shows with the wedding. Dates and venues are added after payment.'}
              </p>
              {wedding !== null ? (
                <Link
                  href={`/admin/invites/${wedding.id}`}
                  className={buttonStyles({ variant: 'secondary' })}
                >
                  Open the live invite
                </Link>
              ) : (
                <AdminActionForm
                  action={changePreviewFunctionsAction.bind(null, lead.id)}
                  label="Save functions"
                >
                  <div className="grid gap-1 sm:grid-cols-2">
                    {FUNCTION_KINDS.map((kind) => (
                      <Checkbox
                        key={kind}
                        label={FESTIVITY_LABELS[kind].name}
                        name="functions"
                        value={kind}
                        defaultChecked={(lead.functions ?? []).includes(kind)}
                      />
                    ))}
                  </div>
                </AdminActionForm>
              )}
            </Card>
          )}

          {lead.deletedAt === null && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-heading">Song</h2>
              <p className="text-small text-ink-soft">
                The song guests can play on the invite.
                {wedding !== null && ' The couple has paid, so the live invite changes too.'}
              </p>
              <SongPicker
                songs={songs}
                currentSlot={currentSlot}
                currentName={currentSong?.name ?? null}
                save={changePreviewSongAction.bind(null, lead.id)}
              />
            </Card>
          )}

          <Card className="flex flex-col gap-4">
            <h2 className="text-heading">Delete</h2>
            <p className="text-small text-ink-soft">
              {lead.deletedAt === null
                ? 'The preview link stops opening. A paid invite is not affected. You can restore it.'
                : 'Deleted. The preview link does not open.'}
            </p>
            <AdminActionForm
              key="delete"
              {...(lead.deletedAt === null
                ? {
                    action: deleteLeadAction.bind(null, lead.id),
                    label: 'Delete preview',
                    confirm: {
                      title: 'Delete this preview?',
                      body: 'The couple can no longer open the preview link.',
                      confirmLabel: 'Delete preview',
                    },
                  }
                : {
                    action: restoreLeadAction.bind(null, lead.id),
                    label: 'Restore preview',
                    variant: 'primary' as const,
                  })}
            />
          </Card>
        </div>
      </main>
    </>
  );
}

/**
 * The address the Make live card offers: the one the couple chose on the
 * sign-up card when it is still free, otherwise the first free suggestion
 * from their names. Empty when none is free: the admin types one.
 */
/** The preview's measured activity, or `null` when it did not load. */
async function previewActivity(leadId: string): Promise<PreviewActivity | null> {
  try {
    const { items } = await previewBeaconsFor(leadId);
    return buildPreviewActivity(items);
  } catch (error) {
    logger.error('Loading a preview activity failed', error, { leadId });
    return null;
  }
}

async function addressSuggestion(lead: LeadDocument): Promise<string> {
  if (lead.desiredSlug !== undefined && (await checkSlug(lead.desiredSlug)).available) {
    return lead.desiredSlug;
  }
  const [first] = await freeSlugSuggestions(lead.bride, lead.groom, 1);
  return first ?? '';
}

/** The songs to choose from. A failed read hides the choice, not the page. */
async function songOptions(): Promise<SongOption[]> {
  try {
    return await listSongOptions();
  } catch (error) {
    logger.error('Reading the wedding songs failed', error);
    return [];
  }
}
