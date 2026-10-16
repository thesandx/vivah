import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlayButton } from '@/components/ui/PlayButton';

describe('PlayButton', () => {
  const play = vi.fn<() => Promise<void>>();
  const pause = vi.fn();

  beforeEach(() => {
    play.mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads nothing until tapped, then plays and shows pause', () => {
    const { container } = render(<PlayButton src="/api/songs/song-1-a.mp3" title="Kesariya" />);
    const audio = container.querySelector('audio');
    expect(audio).toHaveAttribute('preload', 'none');
    expect(play).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Play Kesariya' }));
    expect(play).toHaveBeenCalledTimes(1);
    act(() => {
      audio?.dispatchEvent(new Event('playing'));
    });
    const pauseButton = screen.getByRole('button', { name: 'Pause Kesariya' });
    expect(pauseButton).toHaveAttribute('aria-pressed', 'true');
    // The pause icon is white, so the light background must not stay on.
    expect(pauseButton).toHaveClass('bg-brand', 'text-on-brand');
    expect(pauseButton).not.toHaveClass('bg-surface');
    expect(pauseButton).not.toHaveClass('text-ink');
    expect(pauseButton.querySelector('svg rect')).not.toBeNull();
  });

  it('tells the caller when a tap starts the song', () => {
    const onPlay = vi.fn();
    render(<PlayButton src="/a.mp3" title="Kesariya" onPlay={onPlay} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play Kesariya' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('pauses the song playing elsewhere when another starts', () => {
    render(
      <>
        <PlayButton src="/a.mp3" title="Kesariya" />
        <PlayButton src="/b.mp3" title="Tum Hi Ho" />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play Kesariya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play Tum Hi Ho' }));
    expect(pause).toHaveBeenCalled();
  });

  it('says so when the song cannot play', async () => {
    play.mockRejectedValue(new Error('NotAllowedError'));
    render(<PlayButton src="/a.mp3" title="Kesariya" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Kesariya' }));
    });
    expect(screen.getByText('Kesariya could not play.')).toBeInTheDocument();
  });
});
