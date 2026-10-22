import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type HowTo, HowToSection } from '@/components/help/HowToSection';

const HOW_TO: HowTo = {
  id: 'edit-details',
  eyebrow: 'Your details',
  title: 'Change the time, venue or map',
  intro: 'Change your details as often as you need.',
  steps: ['Tap “Edit details”.', 'Tap “Save details”.'],
  tips: ['Tap Cancel to leave without a change.'],
  videoLabel: 'Video: change your wedding details',
};

describe('HowToSection', () => {
  it('numbers the steps and lists the tips', () => {
    render(<HowToSection howTo={HOW_TO} video={null} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Tap “Save details”.')).toBeInTheDocument();
  });

  it('shows no video when none is uploaded', () => {
    const { container } = render(<HowToSection howTo={HOW_TO} video={null} />);
    expect(container.querySelector('video')).toBeNull();
  });

  it('plays the signed URL, then falls back to the route that signs a fresh one', () => {
    const { container } = render(
      <HowToSection
        howTo={HOW_TO}
        video={{ src: 'https://signed/v.mp4', fallbackSrc: '/api/demo-video/v.mp4', poster: '' }}
      />,
    );
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('preload', 'none');
    expect(video).not.toHaveAttribute('poster');
    expect(video).toHaveAttribute('aria-label', 'Video: change your wedding details');
    const sources = [...container.querySelectorAll('video source')].map((source) =>
      source.getAttribute('src'),
    );
    expect(sources).toEqual(['https://signed/v.mp4', '/api/demo-video/v.mp4']);
  });
});
