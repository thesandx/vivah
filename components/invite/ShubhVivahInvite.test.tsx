import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShubhVivahInvite, type ShubhVivahInviteProps } from '@/components/invite/ShubhVivahInvite';

const full: ShubhVivahInviteProps = {
  bride: 'Anushka',
  groom: 'Sandeep',
  guestName: 'Kartheek',
  weddingDate: '2026-03-09',
  ceremonyTime: '19:00',
  venueName: 'The Grand Pavilion',
  venueCity: 'Chhatarpur, New Delhi',
  venueMapsUrl: 'https://maps.app.goo.gl/Ek5VHxyC6qYr2sW86',
  rsvpPhoneE164: '+917983873235',
  madeByUrl: 'https://vivah.online/?utm_source=invite&utm_medium=footer',
};

describe('ShubhVivahInvite', () => {
  it('greets the guest and shows the couple, the day, time and place', () => {
    render(<ShubhVivahInvite {...full} />);
    expect(screen.getByText('Dear Kartheek,')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Anushka&Sandeep');
    expect(screen.getByText('Monday, 9 March 2026')).toBeInTheDocument();
    expect(screen.getByText('7:00 PM onwards')).toBeInTheDocument();
    expect(screen.getByText('The Grand Pavilion')).toBeInTheDocument();
    expect(screen.getByText('Chhatarpur, New Delhi')).toBeInTheDocument();
  });

  it('opens with the Ganesh shloka, as a printed card does', () => {
    render(<ShubhVivahInvite {...full} />);
    expect(screen.getByText('॥ श्री गणेशाय नमः ॥')).toBeInTheDocument();
    expect(screen.getByText(/blessings of Shri Ganesh/)).toBeInTheDocument();
  });

  it('hides the date under three scratch cards', () => {
    render(<ShubhVivahInvite {...full} />);
    const section = screen.getByRole('region', { name: 'Save the date' });
    expect(section).toHaveTextContent('09');
    expect(section).toHaveTextContent('Mar');
    expect(section).toHaveTextContent('2026');
    expect(section.querySelectorAll('canvas')).toHaveLength(3);
  });

  it('links the venue map, the calendar, the WhatsApp RSVP and the phone', () => {
    render(<ShubhVivahInvite {...full} />);
    expect(screen.getByRole('link', { name: /wedding venue/i })).toHaveAttribute(
      'href',
      full.venueMapsUrl,
    );
    expect(screen.getByRole('link', { name: /add to calendar/i }).getAttribute('href')).toMatch(
      /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/,
    );
    const rsvp = screen.getByRole('link', { name: /rsvp now/i }).getAttribute('href') ?? '';
    expect(rsvp).toMatch(/^https:\/\/wa\.me\/917983873235\?text=/);
    expect(decodeURIComponent(rsvp)).toContain('I (Kartheek) will be attending');
    expect(screen.getByRole('link', { name: '+91 79838 73235' })).toHaveAttribute(
      'href',
      'tel:+917983873235',
    );
  });

  it('says what is still to come', () => {
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
    expect(screen.queryByText(/^Dear /)).not.toBeInTheDocument();
    expect(screen.getAllByText('Date to be shared soon')).not.toHaveLength(0);
    expect(screen.getByText('Venue to be shared soon')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Save the date' })).not.toBeInTheDocument();
    // Only the credit links out: no venue, calendar, RSVP or phone.
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('keeps the RSVP in reach on a phone, unless the page asks it not to', () => {
    const { rerender } = render(<ShubhVivahInvite {...full} />);
    expect(screen.getByRole('link', { name: /rsvp now/i })).toHaveClass('sticky');
    rerender(<ShubhVivahInvite {...full} stickyRsvp={false} />);
    expect(screen.getByRole('link', { name: /rsvp now/i })).not.toHaveClass('sticky');
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
