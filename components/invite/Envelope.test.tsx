import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Envelope } from '@/components/invite/Envelope';

function renderEnvelope(
  guestName: string | null = 'Kartheek',
  extra: Partial<React.ComponentProps<typeof Envelope>> = {},
) {
  return render(
    <Envelope
      guestName={guestName}
      initials="S & K"
      couple="Sara & Kabir"
      rememberKey="vivah:opened:test"
      {...extra}
    >
      <h1>The invite</h1>
    </Envelope>,
  );
}

describe('Envelope', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('greets the guest by name on a sealed envelope', () => {
    renderEnvelope();
    expect(screen.getByText('Hi Kartheek')).toBeInTheDocument();
    expect(screen.getByText('S & K')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tap to open/i })).toBeInTheDocument();
  });

  it('uses a plain greeting without a guest name', () => {
    renderEnvelope(null);
    expect(screen.getByText('You are invited')).toBeInTheDocument();
  });

  it('opens on a tap, then remembers the guest', () => {
    renderEnvelope();
    fireEvent.click(screen.getByRole('button', { name: /tap to open/i }));
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(screen.queryByText('Hi Kartheek')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The invite' })).toBeInTheDocument();
    expect(window.localStorage.getItem('vivah:opened:test')).toBe('1');
  });

  it('skips the envelope for a guest who opened it before', () => {
    window.localStorage.setItem('vivah:opened:test', '1');
    renderEnvelope();
    expect(screen.queryByText('Hi Kartheek')).not.toBeInTheDocument();
  });

  it('starts the song on the tap that opens it, then offers a sound button', () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve());
    const pause = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { container } = renderEnvelope('Kartheek', {
      song: { name: 'Kesariya', src: '/api/songs/a.mp3' },
    });
    expect(container.querySelector('audio')).not.toHaveAttribute('autoplay');
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /tap to open/i }));
    expect(play).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    // jsdom never fires `playing`, so the button offers to play.
    expect(screen.getByRole('button', { name: 'Play our song, Kesariya' })).toBeInTheDocument();
    play.mockRestore();
    pause.mockRestore();
  });

  it('always shows the envelope without a remember key, and shows the top and the dock', () => {
    window.localStorage.setItem('vivah:opened:test', '1');
    render(
      <Envelope
        guestName={null}
        initials="S & K"
        couple="Sara & Kabir"
        top={<p>Preview</p>}
        dock={<p>Make it ours</p>}
      >
        <h1>The invite</h1>
      </Envelope>,
    );
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.queryByText('Make it ours')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /tap to open/i }));
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(screen.getByText('Make it ours')).toBeInTheDocument();
  });
});
