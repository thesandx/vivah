'use client';

import { createContext, useContext } from 'react';

import type { SignupStepId } from '@/lib/visit-tracking';

/**
 * Which sign-up card: the one in the hero, the one in the dialog, or the
 * full screen that the `#details` link opens (ads and bio links).
 */
export type SignupPlace = 'hero' | 'dialog' | 'details';

/**
 * Home page visit measurement, for the sign-up card inside `VisitTracker`
 * (`components/analytics/`). Taps on marked buttons and time on sections are
 * counted by the tracker itself. ADR-0014.
 */
export interface VisitTrackingState {
  /** The card reached a step. Repeats in one visit are counted once. */
  trackStep: (step: SignupStepId, place: SignupPlace) => void;
  /** The card made a preview. Sends the beacon at once, before the page moves on. */
  trackLead: (leadId: string, place: SignupPlace) => void;
}

export const VisitTrackingContext = createContext<VisitTrackingState | null>(null);

/** Outside the tracker (every page but home), measurement is off. */
const OFF: VisitTrackingState = {
  trackStep: () => undefined,
  trackLead: () => undefined,
};

/** Reads visit measurement. Never throws: no tracker means no measurement. */
export function useVisitTracking(): VisitTrackingState {
  return useContext(VisitTrackingContext) ?? OFF;
}
