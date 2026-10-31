import { NextResponse } from 'next/server';
import { z } from 'zod';

import { coupleNames as joinCoupleNames } from '@/lib/couple-names';
import { nameOrderFromSlug } from '@/lib/couple-slug';
import { mapHttpError } from '@/lib/http-errors';
import { type LeadRequest, leadRequestSchema } from '@/lib/lead-schema';
import { logger } from '@/lib/logger';
import { clientIp, RateLimiter } from '@/lib/rate-limit';
import { createLead } from '@/services/lead.service';
import { notifyNewLead } from '@/services/telegram.service';
import { checkSlug } from '@/services/wedding.service';
import { songInSlot } from '@/services/wedding-songs.service';
import { sendPreviewLink } from '@/services/whatsapp.service';

/**
 * `POST /api/leads` — a couple asks for their preview. NO SESSION, on purpose.
 *
 * Every other write in this app starts with `requireUser()`. This one cannot:
 * it is the first step of the funnel, before the couple has any account. The
 * PRD makes the home page form the start of sign-up, and sign-in (WhatsApp
 * OTP) comes after payment. ADR-0006 records the decision and its limits:
 *
 *   - It creates a lead and nothing else. It reads nothing back, changes no
 *     existing document, and takes no identity field from the body.
 *   - The body is validated by `leadRequestSchema` (strict: unknown keys fail).
 *   - A filled honeypot field answers like a success and stores nothing.
 *   - The chosen song is named by slot and copied from the admin's list.
 *   - The chosen address is stored on the lead as a wish. Nothing reserves
 *     it until publishing (ADR-0007).
 *   - Each visitor may ask for 5 previews in 10 minutes (`lib/rate-limit.ts`).
 *
 * The response is the preview path, and whether WhatsApp accepted the link
 * (`services/whatsapp.service.ts`). The form opens the preview on screen
 * either way; `whatsappSent` only changes the line under its tick. Sending is
 * off until the Cloud API is configured, and a failed send never fails the
 * sign-up. The team also gets Telegram messages (`services/telegram.service.ts`)
 * with the couple's message and number, so somebody can send the link by hand.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 5 previews per visitor per 10 minutes, per instance. A couple needs one or
 * two; a script filling the `leads` collection is stopped early. See
 * `lib/rate-limit.ts` for what this does not cover.
 */
const limiter = new RateLimiter({ limit: 5, windowMs: 10 * 60_000 });

export async function POST(request: Request): Promise<NextResponse> {
  const verdict = limiter.hit(clientIp(request.headers));
  if (!verdict.allowed) {
    logger.warn('Lead rate limit reached', { retryAfterSeconds: verdict.retryAfterSeconds });
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Too many tries from this phone. Wait a few minutes, then try again.',
      },
      { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } },
    );
  }

  let lead: LeadRequest;
  try {
    lead = leadRequestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      // One message per field, so the form shows each error under its input.
      const fields: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = String(issue.path[0] ?? 'form');
        fields[key] ??= issue.message;
      }
      return NextResponse.json(
        { error: 'invalid_body', message: error.issues[0]?.message ?? 'Check the form.', fields },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'invalid_body', message: 'Body must be valid JSON' },
      { status: 400 },
    );
  }

  if (lead.isBot) {
    // Same shape as a success, so a bot cannot tell it was caught.
    return NextResponse.json({ previewPath: '/', whatsappSent: false }, { status: 201 });
  }

  try {
    // The address was free when the card checked it. Check once more, so a
    // couple whose choice was taken meanwhile chooses again here, not later.
    if (lead.slug !== null && !(await checkSlug(lead.slug)).available) {
      const message = 'Somebody took this address a moment ago. Choose another.';
      return NextResponse.json(
        { error: 'slug_taken', message, fields: { slug: message } },
        { status: 409 },
      );
    }
    // The song by slot, as the admin set it now. A slot emptied meanwhile
    // leaves the lead without a song rather than failing the sign-up.
    const song = lead.songSlot === null ? null : await songInSlot(lead.songSlot);
    const id = await createLead({ ...lead, song });
    // The lead id is logged so a support request can be traced. The phone
    // number is never logged — see CLAUDE.md > Authentication in brief.
    logger.info('Lead created', { leadId: id, hasWeddingDate: lead.weddingDate !== null });
    // Awaited, not fired after the response: Cloud Run may pause the CPU
    // once a response is sent. Both run at once, each under its own timeout,
    // and neither throws.
    // The same order the preview shows: the address may put the groom first.
    const nameOrder =
      lead.slug === null ? null : nameOrderFromSlug(lead.slug, lead.bride, lead.groom);
    const couple = {
      bride: lead.bride,
      groom: lead.groom,
      ...(nameOrder !== null && { nameOrder }),
    };
    const coupleNames = joinCoupleNames(couple);
    const [whatsappSent] = await Promise.all([
      sendPreviewLink({ phoneE164: lead.phoneE164, coupleNames, leadId: id }),
      notifyNewLead({
        leadId: id,
        ...couple,
        weddingDate: lead.weddingDate,
        slug: lead.slug,
        phoneE164: lead.phoneE164,
      }),
    ]);
    return NextResponse.json({ previewPath: `/p/${id}`, whatsappSent }, { status: 201 });
  } catch (error) {
    const mapped = mapHttpError(error);
    if (!mapped.exposeDetail) logger.error('Creating a lead failed', error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
