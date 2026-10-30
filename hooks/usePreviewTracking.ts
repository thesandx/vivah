'use client';

import { createContext, useContext } from 'react';

import type { PreviewEventId } from '@/lib/preview-tracking';

/**
 * Preview page measurement, shared by everything inside `PreviewTracker`
 * (`components/analytics/`). ADR-0019.
 */
export interface PreviewTrackingState {
  /** Records one event. A payment step is sent at once. */
  track: (event: PreviewEventId) => void;
}

export const PreviewTrackingContext = createContext<PreviewTrackingState | null>(null);

/** Outside the tracker (a live invite, a test), measurement is off. */
const OFF: PreviewTrackingState = { track: () => undefined };

/** Reads preview measurement. Never throws: no tracker means no measurement. */
export function usePreviewTracking(): PreviewTrackingState {
  return useContext(PreviewTrackingContext) ?? OFF;
}
