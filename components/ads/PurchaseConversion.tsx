'use client';

import { useEffect } from 'react';

import { reportMetaConversion } from '@/components/ads/MetaPixel';
import { useGoogleAds } from '@/hooks/useGoogleAds';

export interface PurchaseConversionProps {
  /** What the couple paid, in rupees. */
  valueRupees: number;
  /** The payment's id. Google, Meta and this tab each count it once. */
  paymentId: string;
}

/**
 * Reports a purchase to Google Ads and to the Meta Pixel on the
 * payment-success screen. Renders nothing. Each is a no-op when its id was
 * not set at build time.
 */
export function PurchaseConversion({ valueRupees, paymentId }: PurchaseConversionProps) {
  const { reportConversion } = useGoogleAds();

  useEffect(() => {
    reportConversion('purchase', { value: valueRupees, transactionId: paymentId });
    reportMetaConversion('purchase', { value: valueRupees, eventId: paymentId });
  }, [reportConversion, valueRupees, paymentId]);

  return null;
}
