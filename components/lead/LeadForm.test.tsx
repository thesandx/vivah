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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/**
 * Answers the address calls; `lead` answers `POST /api/leads`. Two free
 * addresses are offered, and a typed one is free.
 */
function serve(lead: () => Response, suggestions = ['raadha-shyam', 'shyam-raadha']): void {
  fetchMock.mockImplementation((input) => {
    const url = String(input);
    if (url.startsWith('/api/addresses?slug=')) return Promise.resolve(json({ available: true }));
    if (url.startsWith('/api/addresses')) {
      return Promise.resolve(json({ suggestions, domainLabel: 'vivah.online' }));
    }
    return Promise.resolve(lead());
  });
}

function leadCalls(): Parameters<typeof fetch>[] {
  return fetchMock.mock.calls.filter(([url]) => String(url) === '/api/leads');
}

/** From the second step to the third, once the addresses arrive. */
async function toAddress(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Choose our address' }));
  expect(await screen.findByLabelText('raadha-shyam.vivah.online')).toBeChecked();
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

  it('scrolls the card back into view when a step leaves it above the screen', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
    });
    render(<LeadForm />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    const card = screen
      .getByRole('heading', { name: 'The two of you' })
      .closest('form')?.parentElement;
    if (!card) throw new Error('no card');
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ top: -400 } as DOMRect);
    fillNames();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });

    // Already in view: nothing moves.
    scrollIntoView.mockClear();
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ top: 120 } as DOMRect);
    fireEvent.click(screen.getByRole('button', { name: 'Back to your names' }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('takes Indian numbers only, as 10 digits, and drops an autofilled 0', () => {
    render(<LeadForm />);
    fillNames();
    expect(screen.queryByLabelText('Country code')).not.toBeInTheDocument();
    expect(screen.getByText('+91')).toBeInTheDocument();
    const phone = screen.getByLabelText('WhatsApp number');
    fireEvent.change(phone, { target: { value: '09876543210' } });
    expect(phone).toHaveValue('9876543210');
    fireEvent.change(phone, { target: { value: '98765432101' } });
    expect(phone).toHaveValue('9876543210');
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

  it('asks for the WhatsApp opt-in before it moves on', () => {
    render(<LeadForm />);
    fillNames();
    fireEvent.click(screen.getByLabelText("I'll add the date later"));
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Choose our address' }));

    expect(
      screen.getByText('Tick the box so we can send your preview on WhatsApp.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers free addresses on the third step, and checks a typed one', async () => {
    serve(() => json({}, 500));
    render(<LeadForm />);
    fillNames();
    fillDetails();
    await toAddress();
    expect(screen.getByRole('heading', { name: 'Your own address' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/addresses?bride=Raadha&groom=Shyam',
      expect.anything(),
    );

    fireEvent.click(screen.getByLabelText('Choose my own address'));
    const make = screen.getByRole('button', { name: 'Make my website' });
    expect(make).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Your address'), { target: { value: 'Virushka' } });
    expect(await screen.findByText('virushka.vivah.online is free.')).toBeInTheDocument();
    expect(make).toBeEnabled();

    // Back and forward again keeps the choice and does not ask twice.
    fireEvent.click(screen.getByRole('button', { name: 'Back to your big day' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose our address' }));
    expect(screen.getByLabelText('Your address')).toHaveValue('virushka');
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('bride='))).toHaveLength(1);
  });

  it('posts the form, shows the website being made, then opens the preview', async () => {
    serve(() => json({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' }, 201));
    render(<LeadForm />);
    fillNames();
    fillDetails();
    await toAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Make my website' }));

    expect(
      screen.getByRole('heading', { name: "Making Raadha & Shyam's website" }),
    ).toBeInTheDocument();
    const body = JSON.parse(String(leadCalls()[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      bride: 'Raadha',
      groom: 'Shyam',
      weddingDate: null,
      countryIso: 'IN',
      phone: '9876543210',
      consent: true,
      slug: 'raadha-shyam',
    });
    expect(body).not.toHaveProperty('website');
    expect(screen.getByText(/raadha-shyam\.vivah\.online/)).toBeInTheDocument();

    await runTheShow();
    expect(screen.getByRole('heading', { name: 'Your website is ready' })).toBeInTheDocument();
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/p/AbCdEfGhIjKlMnOpQrSt'));
  });

  it('returns to the step a server error belongs to', async () => {
    serve(() =>
      json(
        {
          message: 'Numbers in India have 10 digits. You entered 9.',
          fields: { phone: 'Numbers in India have 10 digits. You entered 9.' },
        },
        400,
      ),
    );
    render(<LeadForm />);
    fillNames();
    fillDetails();
    await toAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Make my website' }));

    expect(await screen.findByText('Your website was not created.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your big day' })).toBeInTheDocument();
    expect(screen.getAllByText('Numbers in India have 10 digits. You entered 9.')).toHaveLength(2);
    expect(assign).not.toHaveBeenCalled();
  });

  it('offers fresh addresses when the chosen one was taken meanwhile', async () => {
    let answer = json({ message: 'Taken.', fields: { slug: 'Taken.' } }, 409);
    serve(() => answer);
    let lists = 0;
    const addresses = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) => {
      // The second list no longer has the address another couple took.
      if (String(input).includes('bride=') && (lists += 1) > 1) {
        return Promise.resolve(
          json({ suggestions: ['shyam-raadha'], domainLabel: 'vivah.online' }),
        );
      }
      return addresses?.(input, init) ?? Promise.reject(new Error('no mock'));
    });
    render(<LeadForm />);
    fillNames();
    fillDetails();
    await toAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Make my website' }));

    expect(await screen.findByText('Your website was not created.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your own address' })).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('bride='))).toHaveLength(
        2,
      ),
    );
    answer = json({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' }, 201);
    expect(await screen.findByLabelText('shyam-raadha.vivah.online')).toBeChecked();
    expect(screen.queryByLabelText('raadha-shyam.vivah.online')).not.toBeInTheDocument();
  });
});
