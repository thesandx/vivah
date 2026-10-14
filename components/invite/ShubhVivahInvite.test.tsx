import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShubhVivahInvite, type ShubhVivahInviteProps } from '@/components/invite/ShubhVivahInvite';

const full: ShubhVivahInviteProps = {
  bride: 'Anushka',
  groom: 'Sandeep',
  guestName: 'Kartheek',
  weddingDate: '2026-03-09',
  ceremonyTime: '19:00',
  venueName: 'Laxmisagar',
  venueCity: 'Darbhanga, Bihar',
  venueMapsUrl: 'https://maps.app.goo.gl/Ek5VHxyC6qYr2sW86',
  rsvpPhoneE164: '+917983873235',
  madeByUrl: 'https://vivah.online/?utm_source=invite&utm_medium=footer',
};

describe('ShubhVivahInvite', () => {
  it('greets the guest and shows the day, time and place', () => {
    render(<ShubhVivahInvite {...full} />);
    expect(screen.getByText('Hi Kartheek,')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Anushka&Sandeep');
    expect(screen.getByText('Monday, 9 March 2026 · 7:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Laxmisagar')).toBeInTheDocument();
    expect(screen.getByText('Darbhanga, Bihar')).toBeInTheDocument();
  });

  it('links the venue map, the WhatsApp RSVP and the phone', () => {
    render(<ShubhVivahInvite {...full} />);
    expect(screen.getByRole('link', { name: /wedding venue/i })).toHaveAttribute(
      'href',
      full.venueMapsUrl,
    );
    const rsvp = screen.getByRole('link', { name: /rsvp now/i }).getAttribute('href') ?? '';
    expect(rsvp).toMatch(/^https:\/\/wa\.me\/917983873235\?text=/);
    expect(decodeURIComponent(rsvp)).toContain('I (Kartheek) will be attending');
    expect(screen.getByRole('link', { name: '+91 79838 73235' })).toHaveAttribute(
      'href',
      'tel:+917983873235',
    );
  });

  it('says what is still to come, and has no RSVP on the preview', () => {
    render(
      <ShubhVivahInvite
        {...full}
        guestName={null}
        weddingDate={null}
        ceremonyTime={null}
        venueName={null}
        venueCity={null}
        venueMapsUrl={null}
        rsvpPhoneE164={null}
      />,
    );
    expect(screen.queryByText(/^Hi /)).not.toBeInTheDocument();
    expect(screen.getByText('Date to be shared soon')).toBeInTheDocument();
    expect(screen.getByText('Venue to be shared soon')).toBeInTheDocument();
    // Only the credit links out: no venue, RSVP or phone on a preview.
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('credits vivah.online at the foot of the invite', () => {
    render(<ShubhVivahInvite {...full} />);
    expect(screen.getByRole('link', { name: /made with love by vivah\.online/i })).toHaveAttribute(
      'href',
      full.madeByUrl,
    );
  });

  it('ignores a venue link that is not Google Maps', () => {
    render(<ShubhVivahInvite {...full} venueMapsUrl="https://evil.example/maps" />);
    expect(screen.queryByRole('link', { name: /wedding venue/i })).not.toBeInTheDocument();
  });
});
