import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SoundButton } from './SoundButton';

describe('SoundButton', () => {
  it('shows a speaker with waves while the song plays, and turns it off on a tap', () => {
    const onToggle = vi.fn();
    const { container } = render(<SoundButton playing title="Kesariya" onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: 'Turn off our song, Kesariya' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('.animate-sound-wave')).toHaveLength(2);
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('shows the speaker slashed through while the song is off', () => {
    const { container } = render(
      <SoundButton playing={false} title="Kesariya" onToggle={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Turn on our song, Kesariya' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(container.querySelector('.animate-sound-wave')).toBeNull();
    expect(container.querySelector('.stroke-rani')).not.toBeNull();
  });
});
