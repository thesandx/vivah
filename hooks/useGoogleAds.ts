'use client';

import { createContext, useContext } from 'react';

import type { AdConsent, ConversionKind } from '@/lib/google-ads';

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
  /** The visitor's answer to the banner. `null`: not answered. `undefined`: not read yet. */
  consent: AdConsent | null | undefined;
  accept: () => void;
  decline: () => void;
  /** The click id of the ad that brought this tab here, only with consent. */
  gclidForLead: () => string | null;
  /** Sends a conversion. Does nothing without consent or without its label. */
  reportConversion: (kind: ConversionKind, details?: ConversionDetails) => void;
}

export const GoogleAdsContext = createContext<GoogleAdsState | null>(null);

/** Outside the provider, or with no Google Ads id, measurement is off. */
const OFF: GoogleAdsState = {
  consent: null,
  accept: () => undefined,
  decline: () => undefined,
  gclidForLead: () => null,
  reportConversion: () => undefined,
};

/** Reads Google Ads measurement. Never throws: no provider means no measurement. */
export function useGoogleAds(): GoogleAdsState {
  return useContext(GoogleAdsContext) ?? OFF;
}
