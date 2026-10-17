import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreviewTimer } from '@/components/invite/PreviewTimer';

const { refresh, router } = vi.hoisted(() => {
  const refresh = vi.fn();
  // Next's router is one object for the page's life; so is this one.
  return { refresh, router: { refresh } };
});
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const START = new Date('2026-10-17T12:00:00Z').getTime();

describe('PreviewTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    refresh.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('counts down from the time left and tells the couple to pay', () => {
    render(<PreviewTimer endsAt={START + 30 * 60_000} renderedAt={START} />);
    expect(screen.getByRole('timer')).toHaveTextContent('30:00');
    expect(screen.getByText(/complete payment within 30 minutes/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.getByRole('timer')).toHaveTextContent('28:59');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes the page at zero, so the server closes the preview', () => {
    render(<PreviewTimer endsAt={START + 2000} renderedAt={START} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(5000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
