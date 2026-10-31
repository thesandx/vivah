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
      chosen="priya-rahul"
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
  it('opens on the price once, against what paper cards cost', () => {
    renderBanner();
    expect(screen.getByRole('heading', { name: 'Your invite is ready' })).toBeInTheDocument();
    expect(screen.getByText('₹499')).toBeInTheDocument();
    expect(screen.getByText('₹5,000+')).toBeInTheDocument();
    expect(screen.getByText('and take 2 to 4 weeks')).toBeInTheDocument();
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
    expect(publish).toHaveBeenCalledWith('lead-1', 'priya-rahul');
    expect(screen.queryByText('Total, paid once')).not.toBeInTheDocument();
    const working = await screen.findByRole('button', { name: 'Publishing your invite' });
    expect(working).toBeDisabled();
    fireEvent.click(working);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('opens the checkout from "See everything you get", with the pay button above the ways to pay', () => {
    const { publish } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    expect(screen.getByText('priya-rahul.vivah.online')).toBeInTheDocument();
    expect(screen.getByText('Total, paid once')).toBeInTheDocument();
    expect(screen.getByText(/nothing is charged/)).toBeInTheDocument();
    expect(screen.queryByText(/refund/i)).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Publish our invite' });
    const methods = screen.getByRole('list', { name: 'Ways to pay' });
    expect(button.compareDocumentPosition(methods) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(button);
    expect(publish).toHaveBeenCalledWith('lead-1', 'priya-rahul');
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
    expect(screen.queryByText('₹5,000+')).not.toBeInTheDocument();
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 0,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(await screen.findByText('₹5,000+')).toBeInTheDocument();
    expect(publish).not.toHaveBeenCalled();
  });

  it('pays at once from the short bar too', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 5000,
      configurable: true,
    });
    const { publish } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(publish).toHaveBeenCalledWith('lead-1', 'priya-rahul');
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
        chosen="priya-rahul"
        suggestions={[]}
        domainLabel="vivah.online"
        priceRupees={499}
        mode={mode}
        providerName="Razorpay"
        checkSlug={() => Promise.resolve({ available: true })}
        publish={() => new Promise(() => undefined)}
      />,
    );
  }

  it('asks for payment through the named provider when live, with no test note', () => {
    renderMode('live');
    expect(screen.getByRole('button', { name: 'Make it live · ₹499' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    expect(screen.getByRole('button', { name: 'Make it live · ₹499' })).toBeInTheDocument();
    expect(screen.getByText(/Powered by Razorpay/)).toBeInTheDocument();
    expect(screen.queryByText(/nothing is charged/)).not.toBeInTheDocument();
  });

  it('asks for nothing more once the couple has paid', () => {
    renderMode('paid');
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    expect(screen.getByRole('button', { name: 'Publish our invite' })).toBeInTheDocument();
    expect(screen.getByText(/nothing more to pay/)).toBeInTheDocument();
  });

  it('takes a coupon when live: the price drops, and the pay button sends the code', async () => {
    const publish = vi.fn(() => new Promise<{ ok: false; message: string }>(() => undefined));
    const applyCoupon = vi.fn(() =>
      Promise.resolve({ ok: true as const, code: 'NEW20', percentOff: 20, payableRupees: 399 }),
    );
    render(
      <PublishBanner
        bride="Riya"
        groom="Arjun"
        leadId="lead-1"
        chosen="riya-arjun"
        suggestions={[]}
        domainLabel="vivah.online"
        priceRupees={499}
        mode="live"
        providerName="Razorpay"
        checkSlug={() => Promise.resolve({ available: true })}
        publish={publish}
        applyCoupon={applyCoupon}
        couponOffer={{ code: 'NEW20', percentOff: 20 }}
      />,
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Apply NEW20 · 20% off' })[0] as HTMLElement,
    );
    expect(applyCoupon).toHaveBeenCalledWith('NEW20');
    expect(await screen.findByRole('button', { name: 'Make it live · ₹399' })).toBeInTheDocument();
    expect(screen.getByText('was')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    expect(screen.getByText('Coupon NEW20 (20% off)')).toBeInTheDocument();
    expect(screen.getByText('−₹100')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Make it live · ₹399' }));
    expect(publish).toHaveBeenCalledWith('lead-1', 'riya-arjun', 'NEW20');
  });

  it('names the short bar button "Make it live" when live', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 5000,
      configurable: true,
    });
    renderMode('live');
    expect(screen.getByRole('button', { name: 'Make it live' })).toBeInTheDocument();
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 0,
      configurable: true,
    });
  });

  it('says what the couple gets right after paying', () => {
    renderMode('live');
    expect(screen.getByText(/Right after you pay/)).toHaveTextContent(
      'priya-rahul.vivah.online goes live, with a personal link for every guest',
    );
  });

  it('shows reviews and a WhatsApp chat link beside the pay button', () => {
    render(
      <PublishBanner
        bride="Riya"
        groom="Arjun"
        leadId="lead-1"
        chosen="priya-rahul"
        suggestions={[]}
        domainLabel="vivah.online"
        priceRupees={799}
        mode="live"
        checkSlug={() => Promise.resolve({ available: true })}
        publish={() => new Promise(() => undefined)}
        reviews={[
          { quote: 'Our guests loved it.', names: 'Asha & Dev' },
          { quote: 'So easy to share.', names: 'Meera & Kabir' },
          { quote: 'Not shown.', names: 'Third Couple' },
        ]}
        chatUrl="https://wa.me/919546342507?text=Hi"
      />,
    );
    const reviews = screen.getByRole('list', { name: 'What couples say' });
    expect(reviews).toHaveTextContent('Our guests loved it.');
    expect(reviews).toHaveTextContent('Meera & Kabir');
    expect(reviews).not.toHaveTextContent('Not shown.');
    const chat = screen.getByRole('link', { name: /Chat with us on WhatsApp/ });
    expect(chat).toHaveAttribute('href', 'https://wa.me/919546342507?text=Hi');
    expect(chat).toHaveAttribute('data-preview-event', 'chat-tapped');
    expect(screen.getByText(/Free date change once/)).toBeInTheDocument();
  });

  it('offers a WhatsApp "Share with family" button above the reviews, and no payment chips', () => {
    render(
      <PublishBanner
        bride="Riya"
        groom="Arjun"
        leadId="lead-1"
        chosen="priya-rahul"
        suggestions={[]}
        domainLabel="vivah.online"
        priceRupees={799}
        mode="live"
        checkSlug={() => Promise.resolve({ available: true })}
        publish={() => new Promise(() => undefined)}
        reviews={[{ quote: 'Our guests loved it.', names: 'Asha & Dev' }]}
        shareUrl="https://wa.me/?text=Hi"
      />,
    );
    const share = screen.getByRole('link', { name: 'Share with family' });
    expect(share).toHaveAttribute('href', 'https://wa.me/?text=Hi');
    expect(share).toHaveAttribute('data-preview-event', 'family-share-tapped');
    const reviews = screen.getByRole('list', { name: 'What couples say' });
    expect(share.compareDocumentPosition(reviews) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Ways to pay' })).not.toBeInTheDocument();
  });

  it('offers no coupon line in test mode', () => {
    renderBanner();
    expect(screen.queryByRole('button', { name: 'Have a coupon code?' })).not.toBeInTheDocument();
  });
});
