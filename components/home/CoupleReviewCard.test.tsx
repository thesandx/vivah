import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CoupleReviewCard } from '@/components/home/CoupleReviewCard';
import { LovedByBanner } from '@/components/home/LovedByBanner';

describe('CoupleReviewCard', () => {
  it('puts the words, the names and the stars on the photo', () => {
    render(
      <CoupleReviewCard
        quote="Our relatives kept replaying it."
        names="Riya & Aman"
        relation="Bride and groom"
        stars={5}
        image="/api/testimonials/review/x?v=1"
      />,
    );
    expect(screen.getByText('Our relatives kept replaying it.')).toBeInTheDocument();
    expect(screen.getByText('5 out of 5 stars')).toBeInTheDocument();
    expect(screen.getByText('(Bride and groom)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Riya & Aman, Bride and groom' })).toBeInTheDocument();
  });

  it('leaves out an empty relation', () => {
    render(
      <CoupleReviewCard quote="Lovely" names="Riya & Aman" relation="" stars={4} image="/x" />,
    );
    expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
  });
});

describe('LovedByBanner', () => {
  it('shows the admin’s line with the number set apart', () => {
    render(<LovedByBanner headline="Loved by 500+ happy couples" />);
    expect(screen.getByText('500+').tagName).toBe('SPAN');
    expect(screen.getByText(/happy couples/)).toBeInTheDocument();
  });
});
