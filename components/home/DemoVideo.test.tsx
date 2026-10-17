import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

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

const STEPS = ['A message arrives.', 'The guest taps the link.'];
const SOURCES = [{ src: '/demo/walkthrough.mp4', type: 'video/mp4' }] as const;

describe('DemoVideo', () => {
  it('loads no video before the tap', () => {
    const { container } = render(<DemoVideo sources={SOURCES} poster="" steps={STEPS} />);
    expect(screen.getByRole('button', { name: 'Watch a demo' })).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });

  it('mounts and plays the video on the tap', () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve());
    const { container } = render(
      <DemoVideo sources={SOURCES} poster="/demo/poster.jpg" steps={STEPS} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo' }));

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('poster', '/demo/poster.jpg');
    expect(container.querySelector('source')).toHaveAttribute('src', '/demo/walkthrough.mp4');
    expect(play).toHaveBeenCalled();
    play.mockRestore();
  });

  it('plays muted when the browser refuses sound', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')))
      .mockImplementation(() => Promise.resolve());
    const { container } = render(<DemoVideo sources={SOURCES} poster="" steps={STEPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo' }));

    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(container.querySelector('video')?.muted).toBe(true);
    play.mockRestore();
  });

  it('lists the steps while there is no video', () => {
    const { container } = render(<DemoVideo sources={[]} poster="" steps={STEPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo' }));

    expect(
      screen.getByRole('dialog', { name: 'From WhatsApp to your invite' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The guest taps the link.')).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });

  it('removes the video when the dialog closes', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const { container } = render(<DemoVideo sources={SOURCES} poster="" steps={STEPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Watch a demo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(container.querySelector('video')).toBeNull();
  });
});
