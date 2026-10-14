import { NextResponse } from 'next/server';
import { z } from 'zod';

import { mapHttpError } from '@/lib/http-errors';
import { type LeadRequest, leadRequestSchema } from '@/lib/lead-schema';
import { logger } from '@/lib/logger';
import { createLead } from '@/services/lead.service';

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
 *
 * The response is the preview path. Until the WhatsApp templates are approved,
 * the form opens it at once; afterwards the link goes by WhatsApp instead.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
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
    return NextResponse.json({ previewPath: '/' }, { status: 201 });
  }

  try {
    const id = await createLead(lead);
    // The lead id is logged so a support request can be traced. The phone
    // number is never logged — see CLAUDE.md > Authentication in brief.
    logger.info('Lead created', { leadId: id, hasWeddingDate: lead.weddingDate !== null });
    return NextResponse.json({ previewPath: `/p/${id}` }, { status: 201 });
  } catch (error) {
    const mapped = mapHttpError(error);
    if (!mapped.exposeDetail) logger.error('Creating a lead failed', error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
