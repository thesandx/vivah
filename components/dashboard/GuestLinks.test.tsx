import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { type CreateLinkState, GuestLinks, guestMessage } from './GuestLinks';

const LINK = {
  id: 'a'.repeat(64),
  name: 'Rahul Sharma',
  url: 'https://radha-shyam.vivah.online/Rahul-Sharma',
};

// jsdom has <dialog> but no modal behaviour; see components/ui/Dialog.test.tsx.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

function renderLinks(overrides: Partial<React.ComponentProps<typeof GuestLinks>> = {}) {
  const create = vi.fn(
    async (_state: CreateLinkState, form: FormData): Promise<CreateLinkState> => ({
      status: 'created',
      name: String(form.get('guestName')),
      segment: 'Rahul-Sharma',
    }),
  );
  const remove = vi.fn(async () => ({ ok: true as const }));
  render(
    <GuestLinks
      links={[LINK]}
      coupleNames="Radha & Shyam"
      create={create}
      remove={remove}
      {...overrides}
    />,
  );
  return { create, remove };
}

describe('GuestLinks', () => {
  it('sends the typed name and confirms the new link', async () => {
    const { create } = renderLinks();
    fireEvent.change(screen.getByLabelText("Guest's name"), {
      target: { value: 'Rahul Sharma' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Make link' }));
    });
    expect(create.mock.calls[0]?.[1].get('guestName')).toBe('Rahul Sharma');
    expect(await screen.findByText("Rahul Sharma's link is ready.")).toBeVisible();
  });

  it('shows the error the server sends back', async () => {
    renderLinks({
      create: async () => ({ status: 'error', message: 'Use letters and spaces only.' }),
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Make link' }));
    });
    expect(await screen.findByText('Use letters and spaces only.')).toBeVisible();
  });

  it('opens the WhatsApp contact picker with the message and the link', () => {
    renderLinks();
    const share = screen.getByRole('link', { name: "Send Rahul Sharma's link on WhatsApp" });
    const href = share.getAttribute('href') ?? '';
    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(href.split('text=')[1] ?? '')).toBe(
      guestMessage('Rahul Sharma', 'Radha & Shyam', LINK.url),
    );
  });

  it('tells the couple to wait for the WhatsApp preview, once there is a link', () => {
    renderLinks();
    expect(screen.getByText(/wait about 2 seconds/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Preview not showing?' })).toHaveAttribute(
      'href',
      '/help#link-preview',
    );
  });

  it('hides the WhatsApp tip while there are no links', () => {
    renderLinks({ links: [] });
    expect(screen.queryByText(/wait about 2 seconds/)).toBeNull();
  });

  it('puts the link last in the message, so WhatsApp loads the preview', () => {
    expect(guestMessage('Rahul', 'Radha & Shyam', LINK.url).endsWith(LINK.url)).toBe(true);
  });

  it('copies the link', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderLinks();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: "Copy Rahul Sharma's link" }));
    });
    expect(writeText).toHaveBeenCalledWith(LINK.url);
    expect(screen.getByRole('button', { name: "Copy Rahul Sharma's link" })).toHaveTextContent(
      'Copied',
    );
  });

  it('deletes only after the couple confirms', async () => {
    const { remove } = renderLinks();
    fireEvent.click(screen.getByRole('button', { name: "Delete Rahul Sharma's link" }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByText('Are you sure you want to delete this link?')).toBeVisible();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete link' }));
    });
    expect(remove).toHaveBeenCalledWith(LINK.id);
  });

  it('says so when there are no links yet', () => {
    renderLinks({ links: [] });
    expect(screen.getByText(/No guest links yet/)).toBeVisible();
  });
});
