'use client';

import { createContext, useContext } from 'react';

/**
 * The home page's sign-up dialog, shared by every button that opens it: the
 * section calls to action and the sticky bar. `SignupDialogProvider` in
 * `components/lead/` holds the state and renders the dialog.
 */
export interface SignupDialogState {
  /** Plays the heart thread, then opens the dialog with the sign-up card. */
  openSignup: () => void;
  /** True from the tap until the dialog closes: the sticky bar hides meanwhile. */
  isActive: boolean;
}

export const SignupDialogContext = createContext<SignupDialogState | null>(null);

/** Reads the sign-up dialog. Throws outside `SignupDialogProvider`, which is a wiring defect. */
export function useSignupDialog(): SignupDialogState {
  const state = useContext(SignupDialogContext);
  if (state === null) {
    throw new Error('useSignupDialog must be used inside SignupDialogProvider.');
  }
  return state;
}
