// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The preview-link sender, with `fetch` replaced by a fake. The rules under
 * test: nothing is sent while sending is off, the request has the template's
 * shape, and no failure ever escapes as a thrown error.
 */

const whatsapp = {
  enabled: true,
  accessToken: 'test-token',
  phoneNumberId: '123456789012345',
  templateName: 'preview_ready',
  templateLanguage: 'en',
  graphVersion: 'v23.0',
};
vi.mock('@/lib/env', () => ({ env: { whatsapp } }));

const logged = { info: vi.fn(), error: vi.fn() };
vi.mock('@/lib/logger', () => ({ logger: logged }));

const { previewTemplateBody, sendPreviewLink } = await import('./whatsapp.service');

const MESSAGE = {
  phoneE164: '+919876543210',
  coupleNames: 'Riya & Aman',
  leadId: 'AbCdEfGhIjKlMnOpQrSt',
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  whatsapp.enabled = true;
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('previewTemplateBody', () => {
  it('names the template and fills the greeting and the button link', () => {
    expect(previewTemplateBody(MESSAGE)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '919876543210',
      type: 'template',
      template: {
        name: 'preview_ready',
        language: { code: 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: 'Riya & Aman' }] },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: 'AbCdEfGhIjKlMnOpQrSt' }],
          },
        ],
      },
    });
  });
});

describe('sendPreviewLink', () => {
  it('sends nothing while sending is off', async () => {
    whatsapp.enabled = false;
    expect(await sendPreviewLink(MESSAGE)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to the phone number id with the token, under a timeout', async () => {
    fetchMock.mockResolvedValue(Response.json({ messages: [{ id: 'wamid.1' }] }));
    expect(await sendPreviewLink(MESSAGE)).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://graph.facebook.com/v23.0/123456789012345/messages');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toEqual(previewTemplateBody(MESSAGE));
  });

  it('logs the lead id and never the phone number', async () => {
    fetchMock.mockResolvedValue(Response.json({ messages: [{ id: 'wamid.1' }] }));
    await sendPreviewLink(MESSAGE);
    const everything = JSON.stringify([logged.info.mock.calls, logged.error.mock.calls]);
    expect(everything).toContain(MESSAGE.leadId);
    expect(everything).not.toContain('9876543210');
  });

  it('answers false when Meta refuses the message', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { message: 'Template name does not exist' } }, { status: 400 }),
    );
    expect(await sendPreviewLink(MESSAGE)).toBe(false);
    expect(logged.error).toHaveBeenCalledWith(
      'WhatsApp preview message refused',
      undefined,
      expect.objectContaining({ status: 400, leadId: MESSAGE.leadId }),
    );
  });

  it('answers false when the answer has an unexpected shape', async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    expect(await sendPreviewLink(MESSAGE)).toBe(false);
  });

  it('answers false, and does not throw, when the network fails', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    expect(await sendPreviewLink(MESSAGE)).toBe(false);
  });
});
