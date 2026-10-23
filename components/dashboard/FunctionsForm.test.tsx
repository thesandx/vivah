import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FunctionsForm, type FunctionsSaveState } from './FunctionsForm';

const HALDI = {
  kind: 'haldi' as const,
  date: '2026-12-29',
  time: '10:00',
  venue: 'Deera Nilayam Lawns',
  mapsUrl: null,
};

describe('FunctionsForm', () => {
  it('lists the saved functions as text until Edit functions is pressed', () => {
    render(<FunctionsForm initial={[HALDI]} save={vi.fn()} inviteHref="/site/a" />);
    expect(screen.getByText('Haldi')).toBeVisible();
    expect(screen.getByText('Tue · 29 Dec 2026 · 10:00 AM · Deera Nilayam Lawns')).toBeVisible();
    expect(screen.queryByRole('checkbox')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Edit functions' }));
    expect(screen.getByLabelText('Haldi')).toBeChecked();
    expect(screen.getByLabelText('Tilak')).not.toBeChecked();
    expect(screen.getByLabelText('Date')).toHaveValue('2026-12-29');
  });

  it('invites a couple with no functions to add some', () => {
    render(<FunctionsForm initial={[]} save={vi.fn()} inviteHref="/site/a" />);
    expect(screen.getByText(/No functions yet/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Add functions' }));
    expect(screen.queryByLabelText('Date')).toBeNull();
    fireEvent.click(screen.getByLabelText('Reception'));
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
  });

  it('sends the ticked functions and shows the text again after a save', async () => {
    const save = vi.fn(
      async (_state: FunctionsSaveState, _form: FormData): Promise<FunctionsSaveState> => ({
        status: 'saved',
      }),
    );
    render(<FunctionsForm initial={[HALDI]} save={save} inviteHref="/site/anu" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit functions' }));
    fireEvent.click(screen.getByLabelText('Sangeet'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save functions' }));
    });
    expect(await screen.findByText('Saved. Your guests see the new functions now.')).toBeVisible();
    const sent = save.mock.calls[0]?.[1];
    expect(sent?.get('haldi.on')).toBe('1');
    expect(sent?.get('sangeet.on')).toBe('1');
    expect(sent?.get('tilak.on')).toBeNull();
  });

  it('marks the field that is wrong', async () => {
    const save = vi.fn(async (): Promise<FunctionsSaveState> => ({
      status: 'error',
      message: 'Some details need a fix.',
      errors: { 'haldi.mapsUrl': 'Paste the link from Google Maps > Share.' },
    }));
    render(<FunctionsForm initial={[HALDI]} save={save} inviteHref="/site/a" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit functions' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save functions' }));
    });
    expect(await screen.findByText('Some details need a fix.')).toBeVisible();
    expect(screen.getByText('Paste the link from Google Maps > Share.')).toBeVisible();
  });
});
