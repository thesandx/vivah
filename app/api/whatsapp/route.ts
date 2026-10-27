import { NextResponse } from 'next/server';

import { BUSINESS, whatsAppChatUrl } from '@/lib/business';
import { getWhatsAppHello } from '@/services/whatsapp-hello.service';

/**
 * `GET /api/whatsapp` — opens a WhatsApp chat with our business number, with
 * the admin's first message typed in (`lib/whatsapp-hello.ts`). Every "chat
 * with us" link points here, so the pages stay static and one save in
 * `/admin` changes every link. It reads one cached document and writes
 * nothing.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const message = await getWhatsAppHello();
  const response = NextResponse.redirect(whatsAppChatUrl(BUSINESS.whatsAppE164, message), 302);
  // The message can change at any time, and the address is not a page to index.
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex');
  return response;
}
