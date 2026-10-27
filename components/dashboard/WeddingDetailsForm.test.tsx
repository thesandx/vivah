import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type SaveState, WeddingDetailsForm } from './WeddingDetailsForm';

const INITIAL = {
  bride: 'Anushka',
  groom: 'Sandeep',
  nameOrder: 'bride-first',
  weddingDate: '2026-03-09',
  ceremonyTime: '',
  venueName: '',
  venueCity: '',
  venueMapsUrl: '',
};

describe('WeddingDetailsForm', () => {
  it('shows the saved details as text until Edit details is pressed', () => {
    render(<WeddingDetailsForm initial={INITIAL} save={vi.fn()} inviteHref="/site/a" />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Anushka')).toBeVisible();
    expect(screen.getByText('Monday, 9 March 2026')).toBeVisible();
    expect(screen.getAllByText('Not added yet')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getByLabelText("Bride's name")).toHaveValue('Anushka');
    expect(screen.getByLabelText('Wedding date')).toHaveValue('2026-03-09');
    expect(screen.getByLabelText('Venue name')).toHaveValue('');
  });

  it('leaves the name order out when the page sets it in its own card', () => {
    const { unmount } = render(
      <WeddingDetailsForm
        initial={INITIAL}
        save={vi.fn()}
        inviteHref="/site/a"
        showNameOrder={false}
      />,
    );
    expect(screen.queryByText('Name order')).toBeNull();
    unmount();
    render(
      <WeddingDetailsForm
        initial={INITIAL}
        save={vi.fn()}
        inviteHref="/site/a"
        showNameOrder={false}
        startEditing
      />,
    );
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByText('Whose name comes first on your invite?')).toBeNull();
  });

  it('tidies a name the moment its field loses focus', () => {
    render(
      <WeddingDetailsForm initial={INITIAL} save={vi.fn()} inviteHref="/site/a" startEditing />,
    );
    const groom = screen.getByLabelText("Groom's name");
    fireEvent.change(groom, { target: { value: 'SANDEEP kumar' } });
    fireEvent.blur(groom);
    expect(groom).toHaveValue('Sandeep Kumar');
  });

  it('goes back to the text on Cancel', () => {
    render(
      <WeddingDetailsForm initial={INITIAL} save={vi.fn()} inviteHref="/site/a" startEditing />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Edit details' })).toBeVisible();
  });

  it('confirms a save, shows the text again and links to the invite', async () => {
    const save = vi.fn(async (_state: SaveState, _form: FormData): Promise<SaveState> => ({
      status: 'saved',
    }));
    render(
      <WeddingDetailsForm initial={INITIAL} save={save} inviteHref="/site/anu" startEditing />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    });
    expect(await screen.findByText('Saved. Your guests see the new details now.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit details' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open your invite' })).toHaveAttribute(
      'href',
      '/site/anu',
    );
    const sent = save.mock.calls[0]?.[1];
    expect(sent?.get('bride')).toBe('Anushka');
  });

  it('shows the name order and sends the one chosen', async () => {
    const save = vi.fn(async (_state: SaveState, _form: FormData): Promise<SaveState> => ({
      status: 'saved',
    }));
    render(
      <WeddingDetailsForm
        initial={{ ...INITIAL, nameOrder: 'groom-first' }}
        save={save}
        inviteHref="/site/a"
      />,
    );
    expect(screen.getByText('Groom’s name first')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getByRole('radio', { name: 'Groom’s name first' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Bride’s name first' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    });
    expect(save.mock.calls[0]?.[1].get('nameOrder')).toBe('bride-first');
  });

  it('shows the message and marks the field that is wrong', async () => {
    const save = vi.fn(async (): Promise<SaveState> => ({
      status: 'error',
      message: 'Some details need a fix.',
      errors: { venueMapsUrl: 'Paste the link from Google Maps > Share.' },
    }));
    render(<WeddingDetailsForm initial={INITIAL} save={save} inviteHref="/site/a" startEditing />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    });
    expect(await screen.findByText('Some details need a fix.')).toBeVisible();
    expect(screen.getByText('Paste the link from Google Maps > Share.')).toBeVisible();
  });
});
