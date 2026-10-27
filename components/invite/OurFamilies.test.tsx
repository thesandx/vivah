import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OurFamilies } from '@/components/invite/OurFamilies';
import { EMPTY_FAMILY, type WeddingFamilies } from '@/lib/wedding-families';

const FAMILIES: WeddingFamilies = {
  groom: {
    surname: 'Kapoor',
    grandmother: 'Smt. Santosh Kapoor',
    grandfather: 'Shri Om Prakash Kapoor',
    mother: 'Smt. Anita Kapoor',
    father: 'Shri Sunil Kapoor',
  },
  bride: { ...EMPTY_FAMILY, father: 'Shri Rajiv Malhotra' },
};

describe('OurFamilies', () => {
  it('shows each side with its family name, grandparents and parents', () => {
    render(<OurFamilies families={FAMILIES} />);
    expect(screen.getByRole('heading', { name: 'Our Families' })).toBeInTheDocument();
    expect(screen.getByText('Kapoor Parivar')).toBeInTheDocument();
    expect(screen.getByText('Smt. Santosh Kapoor')).toBeInTheDocument();
    expect(screen.getByText('Son of')).toBeInTheDocument();
    expect(screen.getByText('Malhotra Parivar')).toBeInTheDocument();
    expect(screen.getByText('Daughter of')).toBeInTheDocument();
    // The bride's side has no grandparents: no label for them.
    expect(screen.getAllByText('Grandparents')).toHaveLength(1);
  });

  it('puts the bride’s family first, or the groom’s when his name comes first', () => {
    const { rerender } = render(<OurFamilies families={FAMILIES} />);
    const sides = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(sides()).toEqual(['Bride’s family', 'Groom’s family']);
    rerender(<OurFamilies families={FAMILIES} nameOrder="groom-first" />);
    expect(sides()).toEqual(['Groom’s family', 'Bride’s family']);
  });

  it('leaves out a side with no names, and the section with none', () => {
    const { container, rerender } = render(
      <OurFamilies families={{ ...FAMILIES, bride: { ...EMPTY_FAMILY, surname: 'Malhotra' } }} />,
    );
    expect(screen.queryByText('Bride’s family')).toBeNull();
    rerender(<OurFamilies families={{ groom: EMPTY_FAMILY, bride: EMPTY_FAMILY }} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<OurFamilies families={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows placeholders on the unpaid preview', () => {
    render(<OurFamilies families={undefined} placeholder />);
    expect(screen.getAllByText('Grandmother’s name')).toHaveLength(2);
    expect(screen.getAllByText('Father’s name')).toHaveLength(2);
    expect(screen.getByText(/add both families’ names after payment/)).toBeInTheDocument();
  });
});
