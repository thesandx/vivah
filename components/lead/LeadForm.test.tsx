import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LeadForm } from '@/components/lead/LeadForm';

const fetchMock = vi.fn<typeof fetch>();
const assign = vi.fn<(url: string) => void>();

function fillNames(): void {
  fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: 'Raadha' } });
  fireEvent.change(screen.getByLabelText("Groom's name"), { target: { value: 'Shyam' } });
  fireEvent.click(screen.getByRole('button', { name: 'Begin our story' }));
}

function fillDetails(): void {
  fireEvent.click(screen.getByLabelText("I'll add the date later"));
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9876543210' } });
  fireEvent.click(screen.getByLabelText('Send my preview on WhatsApp'));
}

/** Runs the "making" steps, the envelope and the tick to their end. */
async function runTheShow(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
  }
}

describe('LeadForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('wakes the first button only when both names are there, and joins them', () => {
    render(<LeadForm />);
    const begin = screen.getByRole('button', { name: 'Begin our story' });
    expect(begin).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: 'Raadha' } });
    expect(begin).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Groom's name"), { target: { value: '  ' } });
    expect(begin).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Groom's name"), { target: { value: 'Shyam' } });
    expect(begin).toBeEnabled();
    expect(screen.getByText('Shyam')).toBeInTheDocument();
  });

  it('counts down to the wedding day and goes back without losing the names', () => {
    vi.setSystemTime(new Date('2026-10-15T06:00:00Z'));
    render(<LeadForm />);
    fillNames();

    expect(screen.getByRole('heading', { name: 'Your big day' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Wedding date'), { target: { value: '2026-11-14' } });
    expect(screen.getByText('Your forever starts in 30 days')).toBeInTheDocument();
    expect(screen.getByText('Saturday, 14 November 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("I'll add the date later"));
    expect(screen.getByText('Your forever is on its way')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to your names' }));
    expect(screen.getByLabelText("Bride's name")).toHaveValue('Raadha');
  });

  it('asks for the WhatsApp opt-in before it sends anything', () => {
    render(<LeadForm />);
    fillNames();
    fireEvent.click(screen.getByLabelText("I'll add the date later"));
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make my website' }));

    expect(
      screen.getByText('Tick the box so we can send your preview on WhatsApp.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the form, shows the website being made, then opens the preview', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' }), { status: 201 }),
    );
    render(<LeadForm />);
    fillNames();
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Make my website' }));

    expect(
      screen.getByRole('heading', { name: "Making Raadha & Shyam's website" }),
    ).toBeInTheDocument();
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      bride: 'Raadha',
      groom: 'Shyam',
      weddingDate: null,
      countryIso: 'IN',
      phone: '9876543210',
      consent: true,
    });
    expect(body).not.toHaveProperty('website');

    await runTheShow();
    expect(screen.getByRole('heading', { name: 'Your website is ready' })).toBeInTheDocument();
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/p/AbCdEfGhIjKlMnOpQrSt'));
  });

  it('returns to the step a server error belongs to', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Numbers in India have 10 digits. You entered 9.',
          fields: { phone: 'Numbers in India have 10 digits. You entered 9.' },
        }),
        { status: 400 },
      ),
    );
    render(<LeadForm />);
    fillNames();
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Make my website' }));

    expect(await screen.findByText('Your website was not created.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your big day' })).toBeInTheDocument();
    expect(screen.getAllByText('Numbers in India have 10 digits. You entered 9.')).toHaveLength(2);
    expect(assign).not.toHaveBeenCalled();
  });
});
