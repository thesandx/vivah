import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';

describe('WhatsAppIcon', () => {
  it('is hidden from screen readers and takes a size', () => {
    const { container } = render(<WhatsAppIcon className="size-7" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('size-7');
  });
});
