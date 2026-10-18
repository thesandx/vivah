import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PublishBanner } from '@/components/invite/PublishBanner';

function renderBanner() {
  const publish = vi.fn(() => new Promise<{ ok: false; message: string }>(() => undefined));
  render(
    <PublishBanner
      bride="Riya"
      groom="Arjun"
      leadId="lead-1"
      chosen="riya-arjun"
      suggestions={[]}
      domainLabel="vivah.online"
      priceRupees={499}
      checkSlug={() => Promise.resolve({ available: true })}
      publish={publish}
    />,
  );
  return { publish };
}

describe('PublishBanner', () => {
  it('opens on the price once, against every guest at no extra charge', () => {
    renderBanner();
    expect(screen.getByRole('heading', { name: 'Your invite is ready' })).toBeInTheDocument();
    expect(screen.getByText('₹499')).toBeInTheDocument();
    expect(screen.getByText('Share as many times as you like')).toBeInTheDocument();
    expect(screen.queryByText(/paper/i)).not.toBeInTheDocument();
  });

  it('makes no claim it cannot back', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    expect(screen.queryByText(/couples/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    expect(screen.queryByText(/money-back/i)).not.toBeInTheDocument();
  });

  it('goes straight to payment from the green button, without the checkout', async () => {
    const { publish } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to publish' }));
    expect(publish).toHaveBeenCalledWith('lead-1', 'riya-arjun');
    expect(screen.queryByText('Total, paid once')).not.toBeInTheDocument();
    const working = await screen.findByRole('button', { name: 'Publishing your invite' });
    expect(working).toBeDisabled();
    fireEvent.click(working);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('opens the checkout from "See everything you get", with the pay button above the ways to pay', () => {
    const { publish } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    expect(screen.getByText('riya-arjun.vivah.online')).toBeInTheDocument();
    expect(screen.getByText('Total, paid once')).toBeInTheDocument();
    expect(screen.getByText(/nothing is charged/)).toBeInTheDocument();
    expect(screen.queryByText(/refund/i)).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Publish our invite' });
    const methods = screen.getByRole('list', { name: 'Ways to pay' });
    expect(button.compareDocumentPosition(methods) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(button);
    expect(publish).toHaveBeenCalledWith('lead-1', 'riya-arjun');
  });

  it('shows the button working, and refuses a second tap', async () => {
    const { publish } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish our invite' }));
    const working = await screen.findByRole('button', { name: 'Publishing your invite' });
    expect(working).toBeDisabled();
    expect(working).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(working);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('is a short bar while the couple reads, and the full sheet at the foot of the page', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 5000,
      configurable: true,
    });
    const { publish } = renderBanner();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(screen.queryByText('Share as many times as you like')).not.toBeInTheDocument();
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 0,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(await screen.findByText('Share as many times as you like')).toBeInTheDocument();
    expect(publish).not.toHaveBeenCalled();
  });

  it('pays at once from the short bar too', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 5000,
      configurable: true,
    });
    const { publish } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(publish).toHaveBeenCalledWith('lead-1', 'riya-arjun');
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 0,
      configurable: true,
    });
  });

  it('closes again, with the button or Escape', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'See everything you get' })).toBeInTheDocument();
  });
});

describe('PublishBanner modes', () => {
  function renderMode(mode: 'live' | 'paid') {
    render(
      <PublishBanner
        bride="Riya"
        groom="Arjun"
        leadId="lead-1"
        chosen="riya-arjun"
        suggestions={[]}
        domainLabel="vivah.online"
        priceRupees={499}
        mode={mode}
        checkSlug={() => Promise.resolve({ available: true })}
        publish={() => new Promise(() => undefined)}
      />,
    );
  }

  it('asks for payment through Cashfree when live, with no test note', () => {
    renderMode('live');
    expect(screen.getByRole('button', { name: 'Continue to payment · ₹499' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    expect(screen.getByRole('button', { name: 'Pay ₹499 and publish' })).toBeInTheDocument();
    expect(screen.getByText(/Powered by Cashfree/)).toBeInTheDocument();
    expect(screen.queryByText(/nothing is charged/)).not.toBeInTheDocument();
  });

  it('asks for nothing more once the couple has paid', () => {
    renderMode('paid');
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    expect(screen.getByRole('button', { name: 'Publish our invite' })).toBeInTheDocument();
    expect(screen.getByText(/nothing more to pay/)).toBeInTheDocument();
  });
});
