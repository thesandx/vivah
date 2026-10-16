import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseFirebaseAuth } from '@/hooks/useFirebaseAuth';

import { RESEND_AFTER_SECONDS, SignInPanel } from './SignInPanel';

const router = { replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const auth: UseFirebaseAuth = {
  step: 'idle',
  error: null,
  available: true,
  signInWithGoogle: vi.fn(async () => true),
  sendVerificationCode: vi.fn(async () => true),
  confirmVerificationCode: vi.fn(async () => true),
  signOut: vi.fn(async () => {}),
  signOutClient: vi.fn(async () => {}),
  reset: vi.fn(),
};
vi.mock('@/hooks/useFirebaseAuth', () => ({ useFirebaseAuth: () => auth }));

async function reachOtpStep(): Promise<void> {
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '98765 43210' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
  });
}

describe('SignInPanel', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('prefills the country code, so only the number is typed', () => {
    render(<SignInPanel />);
    expect(screen.getByRole('combobox', { name: 'Country code' })).toHaveValue('IN');
    expect(screen.getByLabelText('Phone number')).toHaveValue('');
  });

  it('offers phone OTP only, with no Google button', () => {
    render(<SignInPanel />);
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
  });

  it('hints the last two digits of the number when it knows the site', () => {
    const { rerender } = render(<SignInPanel />);
    expect(screen.queryByText(/It ends in/)).not.toBeInTheDocument();
    rerender(<SignInPanel phoneHintDigits="35" />);
    expect(screen.getByText(/It ends in/)).toHaveTextContent('It ends in ••35.');
  });

  it('sends the OTP to the number in E.164', async () => {
    render(<SignInPanel />);
    await reachOtpStep();
    expect(auth.sendVerificationCode).toHaveBeenCalledWith('+919876543210', 'firebase-recaptcha');
    expect(screen.getByRole('heading', { name: 'Enter the OTP' })).toBeInTheDocument();
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
  });

  it('shows a wrong-length number under the field and sends nothing', async () => {
    render(<SignInPanel />);
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '98765' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    });
    expect(screen.getByLabelText('Phone number')).toHaveAccessibleDescription(
      'Numbers in India have 10 digits. You entered 5.',
    );
    expect(auth.sendVerificationCode).not.toHaveBeenCalled();
  });

  it('verifies as soon as six digits are entered, then goes to the destination', async () => {
    render(<SignInPanel redirectTo="/profile" />);
    await reachOtpStep();
    await act(async () => {
      // An SMS autofill puts the whole code in the box that has focus.
      fireEvent.change(screen.getByLabelText('Digit 1 of 6'), { target: { value: '12a3456' } });
    });
    expect(auth.confirmVerificationCode).toHaveBeenCalledWith('123456');
    expect(router.replace).toHaveBeenCalledWith('/profile');
  });

  it('asks for the OTP in six boxes', async () => {
    render(<SignInPanel />);
    await reachOtpStep();
    const group = screen.getByRole('group', { name: 'OTP' });
    expect(group.querySelectorAll('input')).toHaveLength(6);
  });

  it('has an on-screen back arrow that returns from the OTP step to the number', async () => {
    render(<SignInPanel />);
    await reachOtpStep();
    fireEvent.click(screen.getByRole('button', { name: 'Change phone number' }));
    expect(auth.reset).toHaveBeenCalled();
    expect(screen.getByLabelText('Phone number')).toHaveValue('98765 43210');
  });

  it('unlocks Resend OTP only after the countdown', async () => {
    vi.useFakeTimers();
    render(<SignInPanel />);
    await reachOtpStep();
    expect(screen.queryByRole('button', { name: 'Resend OTP' })).not.toBeInTheDocument();
    expect(screen.getByText(`Resend OTP in ${RESEND_AFTER_SECONDS}s`)).toBeInTheDocument();

    for (let second = 0; second < RESEND_AFTER_SECONDS; second += 1) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByRole('button', { name: 'Resend OTP' })).toBeInTheDocument();
  });

  it('paints the first step in place, then slides forward and back', async () => {
    const { container } = render(<SignInPanel />);
    const step = () => container.querySelector('main > div > div') as HTMLElement;
    expect(step().className).not.toMatch(/animate-slide/);

    await reachOtpStep();
    expect(step()).toHaveClass('animate-slide-in-next');

    fireEvent.click(screen.getByRole('button', { name: 'Change number' }));
    expect(step()).toHaveClass('animate-slide-in-back');
  });
});
