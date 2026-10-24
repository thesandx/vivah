import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OfferRibbon } from '@/components/home/OfferRibbon';

describe('OfferRibbon', () => {
  it('names the code and the discount, and links to the sign-up form', () => {
    render(<OfferRibbon code="NEW20" percentOff={20} href="#start" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '#start');
    expect(link).toHaveTextContent('Wedding season offer: use code NEW20 and get 20% off');
    expect(link).toHaveAttribute('data-track-cta', 'offer-ribbon');
  });
});
