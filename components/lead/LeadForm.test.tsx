import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LeadForm } from '@/components/lead/LeadForm';

const fetchMock = vi.fn<typeof fetch>();
const assign = vi.fn<(url: string) => void>();

function fillForm(): void {
  fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: 'Raadha' } });
  fireEvent.change(screen.getByLabelText("Groom's name"), { target: { value: 'Shyam' } });
  fireEvent.click(screen.getByLabelText("I'll add the date later"));
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9876543210' } });
  fireEvent.click(screen.getByLabelText('Send my preview on WhatsApp'));
}

describe('LeadForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts the form and opens the preview link', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' }), { status: 201 }),
    );
    render(<LeadForm />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'See my invite' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/p/AbCdEfGhIjKlMnOpQrSt'));
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
    expect(screen.getByText('Preview created. Opening it now.')).toBeInTheDocument();
  });

  it('shows the server error under the field it belongs to', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Numbers in India have 10 digits. You entered 5.',
          fields: { phone: 'Numbers in India have 10 digits. You entered 5.' },
        }),
        { status: 400 },
      ),
    );
    render(<LeadForm />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'See my invite' }));

    expect(await screen.findByText('Your preview was not created.')).toBeInTheDocument();
    expect(screen.getAllByText('Numbers in India have 10 digits. You entered 5.')).toHaveLength(2);
    expect(assign).not.toHaveBeenCalled();
  });
});
