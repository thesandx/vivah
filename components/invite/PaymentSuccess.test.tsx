import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentSuccess } from '@/components/invite/PaymentSuccess';

const assign = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('location', { ...window.location, assign });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  assign.mockReset();
});

describe('PaymentSuccess', () => {
  it('says the payment worked, builds the site, counts down and opens it', () => {
    render(
      <PaymentSuccess
        liveUrl="https://riya-arjun.vivah.online"
        hostLabel="riya-arjun.vivah.online"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Payment successful' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByRole('heading', { name: 'Creating your live site' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByRole('heading', { name: /Your live site is ready/ })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('2')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(assign).toHaveBeenCalledWith('https://riya-arjun.vivah.online');
  });

  it('lets the couple open the site at once', () => {
    render(
      <PaymentSuccess
        liveUrl="https://riya-arjun.vivah.online"
        hostLabel="riya-arjun.vivah.online"
      />,
    );
    expect(screen.getByRole('link', { name: 'Open it now' })).toHaveAttribute(
      'href',
      'https://riya-arjun.vivah.online',
    );
  });
});
