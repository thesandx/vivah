import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Envelope } from '@/components/invite/Envelope';

function renderEnvelope(guestName: string | null = 'Kartheek') {
  return render(
    <Envelope guestName={guestName} initials="S & K" rememberKey="vivah:opened:test">
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
    expect(screen.getByText('Hi, you are invited')).toBeInTheDocument();
  });

  it('opens on a tap, then remembers the guest', () => {
    renderEnvelope();
    fireEvent.click(screen.getByRole('button', { name: /tap to open/i }));
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.queryByText('Hi Kartheek')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The invite' })).toBeInTheDocument();
    expect(window.localStorage.getItem('vivah:opened:test')).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: 'Open the envelope again' }));
    expect(screen.getByText('Hi Kartheek')).toBeInTheDocument();
  });

  it('skips the envelope for a guest who opened it before', () => {
    window.localStorage.setItem('vivah:opened:test', '1');
    renderEnvelope();
    expect(screen.queryByText('Hi Kartheek')).not.toBeInTheDocument();
  });
});
