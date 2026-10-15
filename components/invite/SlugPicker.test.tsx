import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type PublishOutcome, type SlugCheck, SlugPicker } from '@/components/invite/SlugPicker';

const checkSlug = vi.fn<(slug: string) => Promise<SlugCheck>>();
const publish = vi.fn<(leadId: string, slug: string) => Promise<PublishOutcome>>();
const assign = vi.fn<(url: string) => void>();

const BOTH_FREE = ['radha-shyam', 'shyam-radha'];

function renderPicker(suggestions: string[] = BOTH_FREE): void {
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

  it('never shows "taken" for a suggestion, and hints at a short custom address', () => {
    renderPicker(['shyam-radha', 'radha-weds-shyam']);
    expect(screen.queryByText('Taken')).not.toBeInTheDocument();
    expect(screen.getByLabelText('shyam-radha.vivah.online')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Choose my own address'));
    expect(screen.getByText(/virushka/)).toBeInTheDocument();
  });

  it('starts on a typed address when there is nothing to suggest', () => {
    renderPicker([]);
    expect(screen.getByLabelText('Choose my own address')).toBeChecked();
    expect(screen.getByLabelText('Your address')).toBeInTheDocument();
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

  it('drops a suggestion that another couple published first and picks the next', async () => {
    publish.mockResolvedValue({ ok: false, message: 'Somebody took this address.', taken: true });
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Pay and publish' }));
    expect(
      await screen.findByText('That address was just published by another couple. Choose again.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('radha-shyam.vivah.online')).not.toBeInTheDocument();
    expect(screen.getByLabelText('shyam-radha.vivah.online')).toBeChecked();
    expect(assign).not.toHaveBeenCalled();
  });

  it('does not let a dot or other symbols into a typed address', async () => {
    checkSlug.mockResolvedValue({ available: true });
    renderPicker();
    fireEvent.click(screen.getByLabelText('Choose my own address'));
    fireEvent.change(screen.getByLabelText('Your address'), {
      target: { value: 'Radha.Shyam_@2' },
    });
    expect(screen.getByLabelText('Your address')).toHaveValue('radhashyam2');
    await waitFor(() => expect(checkSlug).toHaveBeenCalledWith('radhashyam2'));
  });
});
