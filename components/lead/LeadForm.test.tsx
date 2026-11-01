import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LeadForm } from '@/components/lead/LeadForm';
import { todayInIndia } from '@/lib/wedding-date';

const fetchMock = vi.fn<typeof fetch>();
const assign = vi.fn<(url: string) => void>();

function fillNames(): void {
  fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: 'Raadha' } });
  fireEvent.change(screen.getByLabelText("Groom's name"), { target: { value: 'Shyam' } });
  fireEvent.click(screen.getByRole('button', { name: 'Begin our story' }));
}

const DATE = `${Number(todayInIndia().slice(0, 4)) + 1}-06-15`;

function fillDate(): void {
  fireEvent.change(screen.getByLabelText('Wedding date'), { target: { value: DATE } });
}

function fillDetails(): void {
  fillDate();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9876543210' } });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/**
 * Answers the address calls; `lead` answers `POST /api/leads`. Two free
 * addresses are offered, and a typed one is available.
 */
function serve(
  lead: () => Response,
  suggestions = ['raadha-shyam', 'shyam-raadha'],
  songs: unknown[] = [],
): void {
  fetchMock.mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/songs') return Promise.resolve(json({ songs }));
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

/** From the second step past the functions to the address, once the addresses arrive. */
async function toAddress(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Add our functions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Skip, just the wedding' }));
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
    vi.restoreAllMocks();
  });

  it('tidies each name the moment its field loses focus', () => {
    render(<LeadForm />);
    const bride = screen.getByLabelText("Bride's name");
    const groom = screen.getByLabelText("Groom's name");
    fireEvent.change(bride, { target: { value: 'RIYA sharma' } });
    expect(bride).toHaveValue('RIYA sharma');
    fireEvent.blur(bride);
    expect(bride).toHaveValue('Riya Sharma');
    fireEvent.change(groom, { target: { value: 'arjun' } });
    fireEvent.blur(groom);
    expect(groom).toHaveValue('Arjun');
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

    fireEvent.click(screen.getByRole('button', { name: 'Back to your names' }));
    expect(screen.getByLabelText("Bride's name")).toHaveValue('Raadha');
  });

  it('refuses a past wedding date as soon as it is picked', () => {
    vi.setSystemTime(new Date('2026-10-15T06:00:00Z'));
    render(<LeadForm />);
    fillNames();
    const date = screen.getByLabelText('Wedding date');
    expect(date).toHaveAttribute('min', '2026-10-15');

    fireEvent.change(date, { target: { value: '2026-11-14' } });
    fireEvent.change(date, { target: { value: '2026-10-14' } });
    expect(date).toHaveValue('2026-11-14');
    expect(screen.getByText('Pick today or a later date.')).toBeInTheDocument();

    fireEvent.change(date, { target: { value: '2026-10-15' } });
    expect(date).toHaveValue('2026-10-15');
    expect(screen.queryByText('Pick today or a later date.')).not.toBeInTheDocument();
    expect(screen.getByText('Your forever starts today')).toBeInTheDocument();
  });

  it('needs the wedding date before it moves on', () => {
    render(<LeadForm />);
    fillNames();
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9876543210' } });
    expect(screen.getByLabelText('Wedding date')).toBeRequired();
    expect(screen.queryByLabelText("I'll add the date later")).not.toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Add our functions' });
    expect(next).toBeDisabled();

    fillDate();
    expect(next).toBeEnabled();
  });

  it('says what the number is for, with no box to tick', () => {
    render(<LeadForm />);
    fillNames();
    fillDetails();

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('Send my preview on WhatsApp')).toBeInTheDocument();
    expect(screen.getByText(/You also sign in with it later/)).toBeInTheDocument();
    expect(screen.queryByText(/only for your invite/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add our functions' })).toBeEnabled();
  });

  it('asks for the functions on the third step, and sends the ticked ones', async () => {
    serve(() => json({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' }, 201));
    render(<LeadForm />);
    fillNames();
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Add our functions' }));

    expect(screen.getByRole('heading', { name: 'Your functions' })).toBeInTheDocument();
    expect(screen.getByText(/add the date, time and venue of each function/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip, just the wedding' })).toBeEnabled();
    fireEvent.click(screen.getByLabelText('Reception'));
    fireEvent.click(screen.getByLabelText('Haldi'));
    expect(screen.getByLabelText('Haldi')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Choose our address' }));
    await screen.findByLabelText('raadha-shyam.vivah.online');
    fireEvent.click(screen.getByRole('button', { name: 'Make my website' }));

    const body = JSON.parse(String(leadCalls()[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ functions: ['haldi', 'reception'] });
  });

  it('offers free addresses on the fourth step, and checks a typed one', async () => {
    serve(() => json({}, 500));
    render(<LeadForm />);
    fillNames();
    fillDetails();
    await toAddress();
    expect(screen.getByRole('heading', { name: 'Your website link' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/addresses?bride=Raadha&groom=Shyam',
      expect.anything(),
    );

    fireEvent.click(screen.getByLabelText('Type my own link'));
    const make = screen.getByRole('button', { name: 'Make my website' });
    expect(make).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Your link'), { target: { value: 'Virushka' } });
    expect(await screen.findByText('Available.')).toBeInTheDocument();
    expect(screen.getByText(/Goes live when you pay/)).toBeInTheDocument();
    expect(make).toBeEnabled();

    // Back and forward again keeps the choice and does not ask twice.
    fireEvent.click(screen.getByRole('button', { name: 'Back to your functions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip, just the wedding' }));
    expect(screen.getByLabelText('Your link')).toHaveValue('virushka');
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('bride='))).toHaveLength(1);
  });

  it('shows the link as a browser bar, and warns when a home address is typed', async () => {
    serve(() => json({}, 500));
    render(<LeadForm />);
    fillNames();
    fillDetails();
    await toAddress();
    fireEvent.click(screen.getByLabelText('Type my own link'));
    expect(screen.getByText(/Your website link:/).parentElement).toHaveTextContent(
      'https://your-names.vivah.online',
    );

    fireEvent.change(screen.getByLabelText('Your link'), {
      target: { value: 'Flat 12, Sector 5, Noida' },
    });
    expect(screen.getByText(/This looks like a home address/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make my website' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Your link'), { target: { value: 'virushka' } });
    expect(screen.queryByText(/This looks like a home address/)).not.toBeInTheDocument();
    expect(await screen.findByText('Available.')).toBeInTheDocument();
    expect(screen.getByText(/Your website link:/).parentElement).toHaveTextContent(
      'https://virushka.vivah.online',
    );
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
      weddingDate: DATE,
      countryIso: 'IN',
      phone: '9876543210',
      slug: 'raadha-shyam',
    });
    expect(body).not.toHaveProperty('website');
    expect(body).not.toHaveProperty('consent');
    expect(screen.getByText(/raadha-shyam\.vivah\.online/)).toBeInTheDocument();

    await runTheShow();
    expect(screen.getByRole('heading', { name: 'Your website is ready' })).toBeInTheDocument();
    expect(screen.getByText('Opening your preview now.')).toBeInTheDocument();
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/p/AbCdEfGhIjKlMnOpQrSt'));
  });

  it('says the link went to WhatsApp only when the server sent it', async () => {
    serve(() => json({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt', whatsappSent: true }, 201));
    render(<LeadForm />);
    fillNames();
    fillDetails();
    await toAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Make my website' }));

    await runTheShow();
    expect(
      screen.getByText('Sent to your WhatsApp. Opening your preview now.'),
    ).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Your website link' })).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('bride='))).toHaveLength(
        2,
      ),
    );
    answer = json({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' }, 201);
    expect(await screen.findByLabelText('shyam-raadha.vivah.online')).toBeChecked();
    expect(screen.queryByLabelText('raadha-shyam.vivah.online')).not.toBeInTheDocument();
  });

  it('adds a fifth step to choose a song when there are songs, and sends its slot', async () => {
    serve(
      () => json({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' }, 201),
      ['raadha-shyam'],
      [
        { slot: 1, name: 'Kesariya', src: '/api/songs/song-1-abc.mp3' },
        { slot: 3, name: 'Tum Hi Ho', src: '/api/songs/song-3-def.mp3' },
      ],
    );
    render(<LeadForm />);
    fillNames();
    expect(await screen.findByText('Step 2 of 5')).toBeInTheDocument();
    fillDetails();
    await toAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Choose our song' }));

    expect(screen.getByRole('heading', { name: 'Your song' })).toBeInTheDocument();
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Kesariya')).toBeChecked();
    expect(
      screen.getByText(/You can change your song anytime from your dashboard\./),
    ).toBeInTheDocument();
    // Playing a song chooses it.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Play Tum Hi Ho' }));
    expect(screen.getByLabelText('Tum Hi Ho')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Make my website' }));

    const body = JSON.parse(String(leadCalls()[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ slug: 'raadha-shyam', songSlot: 3 });
    expect(screen.getByText('Cueing up Tum Hi Ho')).toBeInTheDocument();
  });

  it('keeps four steps when no songs are set', async () => {
    serve(() => json({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' }, 201));
    render(<LeadForm />);
    fillNames();
    expect(await screen.findByText('Step 2 of 4')).toBeInTheDocument();
    fillDetails();
    await toAddress();
    expect(screen.getByRole('button', { name: 'Make my website' })).toBeEnabled();
  });
});
