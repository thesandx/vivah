import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { HEART_THREAD_MS } from '@/components/lead/HeartThread';
import { SectionCta } from '@/components/lead/SectionCta';
import { SignupDialogProvider } from '@/components/lead/SignupDialogProvider';
import { StickySignupBar } from '@/components/lead/StickySignupBar';

/* jsdom has <dialog> but no modal behaviour; see components/ui/Dialog.test.tsx. */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function reducedMotion(matches: boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches, media: query }) as MediaQueryList,
  );
}

function renderPage() {
  return render(
    <SignupDialogProvider>
      <div id="card">The hero card</div>
      <SectionCta line="Three steps tonight." action="Begin our forever" />
    </SignupDialogProvider>,
  );
}

describe('SignupDialogProvider', () => {
  it('draws the heart thread first, then opens the sign-up card in a dialog', () => {
    vi.useFakeTimers();
    reducedMotion(false);
    const { container } = renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Begin our forever' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-thread-draw')).not.toBeNull();

    act(() => vi.advanceTimersByTime(HEART_THREAD_MS));
    const dialog = screen.getByRole('dialog', { name: 'Make your wedding website' });
    expect(dialog).toHaveTextContent('The two of you');

    act(() => vi.advanceTimersByTime(400));
    expect(container.querySelector('.animate-thread-draw')).toBeNull();
  });

  it('skips the drawing for reduced motion', () => {
    reducedMotion(true);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Begin our forever' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps what the couple typed when the dialog closes and opens again', () => {
    reducedMotion(true);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Begin our forever' }));
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: 'Sara' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Begin our forever' }));
    expect(screen.getByLabelText("Bride's name")).toHaveValue('Sara');
  });
});

describe('SignupScreen from the #details link', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('opens the sign-up card full screen when the address ends in #details', () => {
    window.history.replaceState(null, '', '/?utm_source=instagram#details');
    renderPage();
    const sheet = screen.getByRole('dialog', { name: 'Make your wedding website' });
    expect(sheet).toHaveTextContent('A few quick steps');
    expect(sheet).toHaveTextContent('The two of you');
    expect(within(sheet).getByLabelText("Bride's name")).toBeInTheDocument();
  });

  it('opens when an ad tool put its tags after #details, and moves them to the query', () => {
    window.history.replaceState(null, '', '/#details?utm_source=facebook&fbclid=abc');
    renderPage();
    expect(screen.getByRole('dialog', { name: 'Make your wedding website' })).toBeInTheDocument();
    expect(window.location.search).toBe('?utm_source=facebook&fbclid=abc');
    expect(window.location.hash).toBe('#details');
  });

  it('stays shut on the plain home page', () => {
    renderPage();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on a later change to #details, and closing takes the hash off', () => {
    renderPage();
    act(() => {
      window.location.hash = 'details';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });

  it('has no close button, and a back arrow at the top from step 2', () => {
    window.history.replaceState(null, '', '/#details');
    renderPage();
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: /^Back/ })).not.toBeInTheDocument();

    fireEvent.change(within(sheet).getByLabelText("Bride's name"), { target: { value: 'Priya' } });
    fireEvent.change(within(sheet).getByLabelText("Groom's name"), { target: { value: 'Rahul' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Begin our story' }));
    const backs = within(sheet).getAllByRole('button', { name: 'Back to your names' });
    expect(backs).toHaveLength(1);
    expect(sheet.querySelector('header')).toContainElement(backs[0] ?? null);

    fireEvent.click(backs[0] as HTMLElement);
    expect(within(sheet).getByLabelText("Bride's name")).toHaveValue('Priya');
  });

  it('keeps the query string when it takes the hash off', () => {
    window.history.replaceState(null, '', '/?utm_campaign=A01#details');
    renderPage();
    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(window.location.search).toBe('?utm_campaign=A01');
  });
});

describe('StickySignupBar', () => {
  type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
  let report: Callback = () => {};

  function stubObserver(): void {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: Callback) {
          report = callback;
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
  }

  function renderBar() {
    return render(
      <SignupDialogProvider>
        <div id="card">The hero card</div>
        <StickySignupBar afterId="card" line="Your forever starts here." action="Begin" />
      </SignupDialogProvider>,
    );
  }

  function bar(): HTMLElement {
    return screen.getByText('Your forever starts here.').parentElement
      ?.parentElement as HTMLElement;
  }

  it('shows once the card is above the screen and hides when it comes back', () => {
    stubObserver();
    renderBar();
    expect(bar()).toHaveAttribute('data-shown', 'false');

    act(() => report([{ isIntersecting: false, boundingClientRect: { top: -40 } as DOMRect }]));
    expect(bar()).toHaveAttribute('data-shown', 'true');

    act(() => report([{ isIntersecting: true, boundingClientRect: { top: 20 } as DOMRect }]));
    expect(bar()).toHaveAttribute('data-shown', 'false');
  });

  it('stays hidden while the card is still below the screen', () => {
    stubObserver();
    renderBar();
    act(() => report([{ isIntersecting: false, boundingClientRect: { top: 900 } as DOMRect }]));
    expect(bar()).toHaveAttribute('data-shown', 'false');
  });

  it('hides while the sign-up dialog is open', () => {
    stubObserver();
    reducedMotion(true);
    renderBar();
    act(() => report([{ isIntersecting: false, boundingClientRect: { top: -40 } as DOMRect }]));
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
    expect(bar()).toHaveAttribute('data-shown', 'false');
  });
});
