import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Marquee } from '@/components/ui/Marquee';

const ITEMS = [
  { key: 'a', node: <span>First card</span> },
  { key: 'b', node: <span>Second card</span> },
];

describe('Marquee', () => {
  it('names the row and shows each card once to assistive technology', () => {
    render(<Marquee items={ITEMS} label="Reviews" />);
    const region = screen.getByRole('region', { name: 'Reviews' });
    expect(within(region).getAllByRole('listitem')).toHaveLength(ITEMS.length);
  });

  it('renders a hidden, inert copy for the seamless loop', () => {
    const { container } = render(<Marquee items={ITEMS} label="Reviews" />);
    const lists = container.querySelectorAll('ul');
    expect(lists).toHaveLength(2);
    expect(lists[1]).toHaveAttribute('aria-hidden', 'true');
    expect(lists[1]).toHaveAttribute('inert');
  });

  it('drifts the other way when reversed', () => {
    const { container } = render(<Marquee items={ITEMS} label="Chats" reverse />);
    expect(container.querySelector('.animate-marquee-reverse')).not.toBeNull();
  });
});
