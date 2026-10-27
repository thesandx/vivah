// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_WHATSAPP_HELLO, type WhatsAppHello } from '@/lib/whatsapp-hello';

const recordAdminActionIn = vi.fn();
vi.mock('@/services/admin-audit.service', () => ({
  recordAdminActionIn: (...args: unknown[]) => recordAdminActionIn(...args),
}));

/** The one stored document, or null before the first save. */
let stored: WhatsAppHello | null = null;
let failRead = false;
const writes: Array<{ kind: string; payload: unknown }> = [];
vi.mock('@/services/repository', () => ({
  createRepository: () => ({
    get: async () => {
      if (failRead) throw new Error('unavailable');
      return stored;
    },
    runTransaction: async (
      fn: (repo: unknown, tx: unknown) => Promise<unknown>,
    ): Promise<unknown> =>
      fn(
        {
          get: async () => stored,
          createWithId: (_id: string, payload: WhatsAppHello) => {
            writes.push({ kind: 'create', payload });
            stored = payload;
          },
          update: (_id: string, payload: WhatsAppHello) => {
            writes.push({ kind: 'update', payload });
            stored = payload;
          },
        },
        {},
      ),
  }),
}));

const {
  getWhatsAppHello,
  getWhatsAppHelloForAdmin,
  resetWhatsAppHello,
  resetWhatsAppHelloCache,
  saveWhatsAppHello,
} = await import('@/services/whatsapp-hello.service');

beforeEach(() => {
  stored = null;
  failRead = false;
  writes.length = 0;
  recordAdminActionIn.mockReset();
  resetWhatsAppHelloCache();
});

describe('getWhatsAppHello', () => {
  it('uses the default before the first save', async () => {
    expect(await getWhatsAppHello()).toBe(DEFAULT_WHATSAPP_HELLO);
  });

  it('uses the default when the read fails, and never throws', async () => {
    failRead = true;
    expect(await getWhatsAppHello()).toBe(DEFAULT_WHATSAPP_HELLO);
  });

  it('lets /admin see a failed read', async () => {
    failRead = true;
    await expect(getWhatsAppHelloForAdmin()).rejects.toThrow('unavailable');
  });
});

describe('saveWhatsAppHello', () => {
  it('creates the document, logs the change, and uses it at once', async () => {
    await getWhatsAppHello();
    const result = await saveWhatsAppHello({ message: '  Namaste Vivah!  ' }, 'admin-uid');
    expect(result.ok).toBe(true);
    expect(writes).toEqual([{ kind: 'create', payload: { message: 'Namaste Vivah!' } }]);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'whatsapp-hello-changed', adminUid: 'admin-uid' }),
    );
    expect(await getWhatsAppHello()).toBe('Namaste Vivah!');
  });

  it('refuses an empty or a too-long message and writes nothing', async () => {
    expect((await saveWhatsAppHello({ message: '   ' }, 'admin-uid')).ok).toBe(false);
    expect((await saveWhatsAppHello({ message: 'a'.repeat(301) }, 'admin-uid')).ok).toBe(false);
    expect(writes).toEqual([]);
  });

  it('updates an existing document, and the reset puts the default back', async () => {
    stored = { message: 'Hello' };
    const result = await resetWhatsAppHello('admin-uid');
    expect(result.ok).toBe(true);
    expect(writes).toEqual([{ kind: 'update', payload: { message: DEFAULT_WHATSAPP_HELLO } }]);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'whatsapp-hello-reset' }),
    );
    expect(await getWhatsAppHello()).toBe(DEFAULT_WHATSAPP_HELLO);
  });
});
