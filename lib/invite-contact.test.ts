import { describe, expect, it } from 'vitest';

import { displayPhone, isGoogleMapsUrl, rsvpWhatsAppUrl } from '@/lib/invite-contact';

describe('invite contact links', () => {
  it('prefills the RSVP with the guest name', () => {
    const url = new URL(rsvpWhatsAppUrl('+917983873235', 'Anushka', 'Sandeep', 'Kartheek'));
    expect(url.origin + url.pathname).toBe('https://wa.me/917983873235');
    expect(url.searchParams.get('text')).toBe(
      'Hi Anushka & Sandeep, I (Kartheek) will be attending the wedding!',
    );
    expect(new URL(rsvpWhatsAppUrl('+917983873235', 'A', 'B', null)).searchParams.get('text')).toBe(
      'Hi A & B, I will be attending the wedding!',
    );
  });

  it('groups an Indian number the way people write it', () => {
    expect(displayPhone('+917983873235')).toBe('+91 79838 73235');
    expect(displayPhone('+6591234567')).toBe('+6591234567');
  });

  it('accepts only https Google Maps links', () => {
    expect(isGoogleMapsUrl('https://maps.app.goo.gl/Ek5VHxyC6qYr2sW86?g_st=ipc')).toBe(true);
    expect(isGoogleMapsUrl('https://www.google.com/maps/place/Darbhanga')).toBe(true);
    expect(isGoogleMapsUrl('https://goo.gl/maps/abc')).toBe(true);
    expect(isGoogleMapsUrl('http://maps.app.goo.gl/abc')).toBe(false);
    expect(isGoogleMapsUrl('https://www.google.com/search?q=x')).toBe(false);
    expect(isGoogleMapsUrl('https://evil.example/maps')).toBe(false);
    expect(isGoogleMapsUrl('not a url')).toBe(false);
  });
});
