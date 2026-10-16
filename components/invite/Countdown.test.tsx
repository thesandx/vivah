import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Countdown } from '@/components/invite/Countdown';

const START = Date.parse('2026-03-09T13:30:00Z');

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down to the wedding once it is in the browser', () => {
    vi.setSystemTime(START - (3 * 86_400 + 2 * 3600 + 5) * 1000);
    render(<Countdown target={START} />);
    expect(screen.getAllByText('–')).toHaveLength(4);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText('Days').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Hours').nextSibling).toHaveTextContent('2');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Secs').nextSibling).toHaveTextContent('4');
    expect(screen.getByText('Our forever starts in…')).toBeInTheDocument();
    expect(screen.queryByText(/Bless the married couple/)).not.toBeInTheDocument();
  });

  it('blesses the couple after the wedding', () => {
    vi.setSystemTime(START + 1000);
    render(<Countdown target={START} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText('Bless the married couple with a happy life!')).toBeInTheDocument();
    // One or the other, never both.
    expect(screen.queryByText('Our forever starts in…')).not.toBeInTheDocument();
    expect(screen.queryByText('Days')).not.toBeInTheDocument();
  });
});
