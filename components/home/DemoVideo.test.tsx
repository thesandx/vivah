import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DemoVideo } from './DemoVideo';

// jsdom has <dialog> and <video> without behaviour. Give them the methods the component calls.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

/** A stand-in IntersectionObserver whose callback the test fires by hand. */
let intersect: (() => void) | null = null;
class FakeObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe() {
    intersect = () =>
      this.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  disconnect() {}
}

const STEPS = ['A message arrives.', 'The guest taps the link.'];
const VIDEO = {
  src: 'https://storage.test/demo-video-abc.mp4?sig=1',
  fallbackSrc: '/api/demo-video/demo-video-abc.mp4',
  poster: 'https://storage.test/demo-poster-abc.jpg?sig=1',
};

let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  intersect = null;
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function nearScreen() {
  act(() => intersect?.());
}

describe('DemoVideo', () => {
  it('loads no video before the button nears the screen', () => {
    const { container } = render(<DemoVideo video={VIDEO} steps={STEPS} />);
    expect(screen.getByRole('button', { name: 'Watch a demo' })).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });

  it('readies the player, index only, when the button nears the screen', () => {
    const { container } = render(<DemoVideo video={VIDEO} steps={STEPS} />);
    nearScreen();
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', VIDEO.src);
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(video).toHaveAttribute('poster', VIDEO.poster);
    expect(video).toHaveAttribute('playsinline');
    expect(play).not.toHaveBeenCalled();
  });

  it('plays inside the tap, so a phone allows sound', () => {
    const { container } = render(<DemoVideo video={VIDEO} steps={STEPS} />);
    nearScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo' }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(container.querySelector('video')?.preload).toBe('auto');
    expect(container.querySelector('video')?.muted).toBe(false);
  });

  it('mounts and plays when the tap comes first', () => {
    const { container } = render(<DemoVideo video={VIDEO} steps={STEPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo' }));
    expect(container.querySelector('video')).not.toBeNull();
    expect(play).toHaveBeenCalled();
  });

  it('plays muted when the browser refuses sound', async () => {
    play
      .mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')))
      .mockImplementation(() => Promise.resolve());
    const { container } = render(<DemoVideo video={VIDEO} steps={STEPS} />);
    nearScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo' }));

    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(container.querySelector('video')?.muted).toBe(true);
  });

  it('pauses when the dialog closes', () => {
    render(<DemoVideo video={VIDEO} steps={STEPS} />);
    nearScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(pause).toHaveBeenCalled();
  });

  it('signs a fresh URL when the one it has fails', () => {
    const { container } = render(<DemoVideo video={VIDEO} steps={STEPS} />);
    nearScreen();
    const video = container.querySelector('video');
    if (video === null) throw new Error('no video');
    fireEvent.error(video);
    expect(container.querySelector('video')).toHaveAttribute('src', VIDEO.fallbackSrc);
  });

  it('lists the steps while there is no video', () => {
    const { container } = render(<DemoVideo video={null} steps={STEPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo' }));

    expect(
      screen.getByRole('dialog', { name: 'From WhatsApp to your invite' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The guest taps the link.')).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });
});
