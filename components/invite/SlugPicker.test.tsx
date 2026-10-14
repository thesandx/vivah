import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type PublishOutcome,
  type SlugCheck,
  SlugPicker,
  type SlugSuggestion,
} from '@/components/invite/SlugPicker';

const checkSlug = vi.fn<(slug: string) => Promise<SlugCheck>>();
const publish = vi.fn<(leadId: string, slug: string) => Promise<PublishOutcome>>();
const assign = vi.fn<(url: string) => void>();

const BOTH_FREE: SlugSuggestion[] = [
  { slug: 'radha-shyam', available: true },
  { slug: 'shyam-radha', available: true },
];

function renderPicker(suggestions: SlugSuggestion[] = BOTH_FREE): void {
  render(
    <SlugPicker
      leadId="AbCdEfGhIjKlMnOpQrSt"
      suggestions={suggestions}
      domainLabel="vivah.online"
      checkSlug={checkSlug}
      publish={publish}
    />,
  );
}

describe('SlugPicker', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('offers both name orders and chooses bride first', () => {
    renderPicker();
    expect(screen.getByLabelText('radha-shyam.vivah.online')).toBeChecked();
    expect(screen.getByLabelText('shyam-radha.vivah.online')).not.toBeChecked();
    expect(screen.getByLabelText('Choose my own address')).toBeInTheDocument();
  });

  it('disables a taken suggestion and chooses the next free one', () => {
    renderPicker([
      { slug: 'radha-shyam', available: false },
      { slug: 'shyam-radha', available: true },
    ]);
    expect(screen.getByLabelText('radha-shyam.vivah.online')).toBeDisabled();
    expect(screen.getByText('Taken')).toBeInTheDocument();
    expect(screen.getByLabelText('shyam-radha.vivah.online')).toBeChecked();
  });

  it('publishes the chosen address and opens the live invite', async () => {
    publish.mockResolvedValue({ ok: true, url: 'https://radha-shyam.vivah.online' });
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Pay and publish' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://radha-shyam.vivah.online'));
    expect(publish).toHaveBeenCalledWith('AbCdEfGhIjKlMnOpQrSt', 'radha-shyam');
  });

  it('checks a typed address and allows publishing only when it is free', async () => {
    checkSlug.mockResolvedValue({ available: true });
    renderPicker();
    fireEvent.click(screen.getByLabelText('Choose my own address'));
    expect(screen.getByRole('button', { name: 'Pay and publish' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Your address'), { target: { value: 'Radha Weds' } });
    await waitFor(() => expect(checkSlug).toHaveBeenCalledWith('radha-weds'));
    expect(await screen.findByText('radha-weds.vivah.online is free.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay and publish' })).toBeEnabled();
  });

  it('says when a typed address is taken', async () => {
    checkSlug.mockResolvedValue({ available: false, reason: 'taken' });
    renderPicker();
    fireEvent.click(screen.getByLabelText('Choose my own address'));
    fireEvent.change(screen.getByLabelText('Your address'), { target: { value: 'ram-sita' } });
    expect(await screen.findByText('This address is taken. Try another.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay and publish' })).toBeDisabled();
  });

  it('marks a suggestion taken when somebody published there first', async () => {
    publish.mockResolvedValue({ ok: false, message: 'Somebody took this address.', taken: true });
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Pay and publish' }));
    expect(await screen.findByText('Somebody took this address.')).toBeInTheDocument();
    expect(screen.getByLabelText('radha-shyam.vivah.online')).toBeDisabled();
    expect(assign).not.toHaveBeenCalled();
  });
});
