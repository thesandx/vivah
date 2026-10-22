'use client';

import { createContext, useContext } from 'react';

import type { ConversionKind } from '@/lib/google-ads';

/** What a conversion carries beyond its kind. */
export interface ConversionDetails {
  /** In rupees. Sent with the currency `INR`. */
  value?: number;
  /** Google counts one conversion per id, so a refresh never counts twice. */
  transactionId?: string;
}

/**
 * Google Ads measurement, shared by everything inside `GoogleAdsProvider`
 * (`components/ads/`). ADR-0013.
 */
export interface GoogleAdsState {
  /** The click id of the ad that brought this tab here, or `null`. */
  gclidForLead: () => string | null;
  /** Sends a conversion. Does nothing when its label is not set. */
  reportConversion: (kind: ConversionKind, details?: ConversionDetails) => void;
}

export const GoogleAdsContext = createContext<GoogleAdsState | null>(null);

/** Outside the provider, or with no Google Ads id, measurement is off. */
const OFF: GoogleAdsState = {
  gclidForLead: () => null,
  reportConversion: () => undefined,
};

/** Reads Google Ads measurement. Never throws: no provider means no measurement. */
export function useGoogleAds(): GoogleAdsState {
  return useContext(GoogleAdsContext) ?? OFF;
}
