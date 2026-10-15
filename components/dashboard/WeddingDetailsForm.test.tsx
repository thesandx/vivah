import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type SaveState, WeddingDetailsForm } from './WeddingDetailsForm';

const INITIAL = {
  bride: 'Anushka',
  groom: 'Sandeep',
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
