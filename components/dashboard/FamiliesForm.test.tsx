import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EMPTY_FAMILY, type WeddingFamilies } from '@/lib/wedding-families';

import { FamiliesForm, type FamiliesSaveState } from './FamiliesForm';

const FAMILIES: WeddingFamilies = {
  groom: { ...EMPTY_FAMILY, mother: 'Smt. Anita Kapoor', father: 'Shri Sunil Kapoor' },
  bride: EMPTY_FAMILY,
};

describe('FamiliesForm', () => {
  it('lists the saved names as text until Edit family names is pressed', () => {
    render(
      <FamiliesForm
        bride="Priya"
        groom="Rahul"
        initial={FAMILIES}
        save={vi.fn()}
        inviteHref="/site/a"
      />,
    );
    expect(screen.getByText('Son of: Smt. Anita Kapoor & Shri Sunil Kapoor')).toBeVisible();
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit family names' }));
    expect(screen.getAllByLabelText('Mother')[1]).toHaveValue('Smt. Anita Kapoor');
    // Empty until the couple writes one; the hint says what the card shows.
    expect(screen.getAllByLabelText('Family title')[1]).toHaveValue('');
    expect(screen.getByText(/Left empty, the card shows “Kapoor Parivar”/)).toBeVisible();
  });

  it('invites a couple with no names to add them', () => {
    render(
      <FamiliesForm
        bride="Priya"
        groom="Rahul"
        initial={undefined}
        save={vi.fn()}
        inviteHref="/site/a"
      />,
    );
    expect(screen.getByText(/No family names yet/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Add family names' }));
    expect(screen.getAllByLabelText('Grandmother')).toHaveLength(2);
  });

  it('sends the names and shows the text again after a save', async () => {
    const save = vi.fn(
      async (_state: FamiliesSaveState, _form: FormData): Promise<FamiliesSaveState> => ({
        status: 'saved',
      }),
    );
    render(
      <FamiliesForm
        bride="Priya"
        groom="Rahul"
        initial={FAMILIES}
        save={save}
        inviteHref="/site/a"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit family names' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save family names' }));
    });
    expect(await screen.findByText('Saved. Your guests see your families now.')).toBeVisible();
    expect(save.mock.calls[0]?.[1].get('groom.father')).toBe('Shri Sunil Kapoor');
  });

  it('fills the title with a tapped suggestion, and sends No title', async () => {
    const save = vi.fn(
      async (_state: FamiliesSaveState, _form: FormData): Promise<FamiliesSaveState> => ({
        status: 'saved',
      }),
    );
    render(
      <FamiliesForm
        bride="Priya Malhotra"
        groom="Rahul"
        initial={FAMILIES}
        save={save}
        inviteHref="/site/a"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit family names' }));
    const [brideTitle, groomTitle] = screen.getAllByLabelText('Family title');
    expect(brideTitle).toHaveValue('');
    // The suggestions follow the surname as it is typed.
    expect(screen.queryByRole('button', { name: 'Malhotra Parivar' })).toBeNull();
    fireEvent.change(screen.getAllByLabelText('Father')[0] as HTMLElement, {
      target: { value: 'Shri Rajiv Malhotra' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Malhotra Parivar' }));
    expect(brideTitle).toHaveValue('Malhotra Parivar');
    fireEvent.click(screen.getByRole('button', { name: 'Vadhu Paksh' }));
    expect(brideTitle).toHaveValue('Vadhu Paksh');
    fireEvent.click(screen.getAllByRole('button', { name: 'No title' })[1] as HTMLElement);
    expect(groomTitle).toBeDisabled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save family names' }));
    });
    const sent = save.mock.calls[0]?.[1];
    expect(sent?.get('bride.title')).toBe('Vadhu Paksh');
    expect(sent?.get('groom.noTitle')).toBe('1');
  });

  it('marks the field that is wrong', async () => {
    const save = vi.fn(async (): Promise<FamiliesSaveState> => ({
      status: 'error',
      message: 'Some names need a fix.',
      errors: { 'bride.father': 'Keep this under 60 characters.' },
    }));
    render(
      <FamiliesForm
        bride="Priya"
        groom="Rahul"
        initial={undefined}
        save={save}
        inviteHref="/site/a"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add family names' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save family names' }));
    });
    expect(await screen.findByText('Keep this under 60 characters.')).toBeVisible();
  });
});
