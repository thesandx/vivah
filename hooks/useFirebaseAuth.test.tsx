import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type UseFirebaseAuth, useFirebaseAuth } from './useFirebaseAuth';

vi.mock('@/lib/firebase-config', () => ({
  getFirebaseWebConfig: () => ({ apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a' }),
}));

/** Behaves like reCAPTCHA: an element can hold one widget, ever. */
const rendered = new WeakSet<HTMLElement>();
const signInWithPhoneNumber = vi.fn();

vi.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({}) }));
vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  GoogleAuthProvider: class {},
  RecaptchaVerifier: class {
    constructor(_auth: unknown, element: HTMLElement) {
      if (rendered.has(element)) throw new Error('reCAPTCHA has already been rendered here');
      rendered.add(element);
      element.appendChild(document.createElement('iframe'));
    }
    // An invisible verifier's clear() leaves its widget in the DOM.
    clear(): void {}
  },
  signInWithPhoneNumber: (...args: unknown[]) => signInWithPhoneNumber(...args),
}));

function mount(): { current: UseFirebaseAuth } {
  const result = {} as { current: UseFirebaseAuth };
  function Probe(): React.JSX.Element {
    result.current = useFirebaseAuth();
    return <div id="recaptcha" />;
  }
  render(<Probe />);
  return result;
}

describe('useFirebaseAuth phone sign-in', () => {
  beforeEach(() => signInWithPhoneNumber.mockReset());

  it('sends again after a failed send, without a reload', async () => {
    signInWithPhoneNumber
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/invalid-app-credential' }))
      .mockResolvedValueOnce({ confirm: vi.fn() });
    const auth = mount();

    await act(async () => {
      expect(await auth.current.sendVerificationCode('+919876543210', 'recaptcha')).toBe(false);
    });
    expect(auth.current.error).toBe(
      'The robot check did not pass. Wait a moment, then tap the button again.',
    );

    await act(async () => {
      expect(await auth.current.sendVerificationCode('+919876543210', 'recaptcha')).toBe(true);
    });
    expect(auth.current.step).toBe('awaiting-code');
    // The failed widget is gone; only the live one is left.
    expect(document.getElementById('recaptcha')?.children).toHaveLength(1);
  });

  it('names the Firebase code when it has no message for it', async () => {
    signInWithPhoneNumber.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'auth/internal-error' }),
    );
    const auth = mount();
    await act(async () => {
      await auth.current.sendVerificationCode('+919876543210', 'recaptcha');
    });
    expect(auth.current.error).toBe('Sign-in failed (auth/internal-error). Try again.');
  });
});
