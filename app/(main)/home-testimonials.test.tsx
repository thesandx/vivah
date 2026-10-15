import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getHomeTestimonials = vi.fn();
vi.mock('@/services/testimonials.service', () => ({
  getHomeTestimonials: () => getHomeTestimonials(),
}));

const { HomeTestimonials } = await import('@/app/(main)/home-testimonials');
const { SignupDialogProvider } = await import('@/components/lead/SignupDialogProvider');

const STORED = {
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  position: 0,
};

/** An async Server Component renders by awaiting it (docs/testing.md, trap 10). */
async function renderIt() {
  // Each row's call to action opens the sign-up dialog, so it needs the provider.
  render(<SignupDialogProvider>{await HomeTestimonials()}</SignupDialogProvider>);
}

describe('HomeTestimonials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows nothing at all until the admin adds something', async () => {
    getHomeTestimonials.mockResolvedValue({ chats: [], reviews: [], headline: '' });
    await renderIt();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows nothing when the read fails', async () => {
    getHomeTestimonials.mockRejectedValue(new Error('down'));
    await renderIt();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows the banner and both rows when they have items', async () => {
    getHomeTestimonials.mockResolvedValue({
      headline: 'Loved by 500+ happy couples',
      reviews: [
        {
          ...STORED,
          id: 'Review1234567890',
          quote: 'Lovely',
          names: 'Riya & Aman',
          relation: '',
          stars: 5,
          image: 'siteContent/home-reviews/review-abc.webp',
        },
      ],
      chats: [
        {
          ...STORED,
          id: 'Chat123456789012',
          message: 'Thank you',
          caption: '',
          app: 'whatsapp',
          image: 'siteContent/home-chats/chat-def.webp',
        },
      ],
    });
    await renderIt();
    expect(screen.getByText('500+')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Reviews from couples' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Messages from couples' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Riya & Aman' })).toHaveAttribute(
      'src',
      '/api/testimonials/review/Review1234567890?v=abc',
    );
    expect(screen.getByRole('button', { name: 'Write ours next' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make the family go aww' })).toBeInTheDocument();
  });
});
