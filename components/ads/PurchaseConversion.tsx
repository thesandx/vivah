'use client';

import { useEffect } from 'react';

import { useGoogleAds } from '@/hooks/useGoogleAds';

export interface PurchaseConversionProps {
  /** What the couple paid, in rupees. */
  valueRupees: number;
  /** The payment's id. Google and this tab both count it once. */
  paymentId: string;
}

/**
 * Reports a purchase to Google Ads on the payment-success screen. Renders
 * nothing.
 */
export function PurchaseConversion({ valueRupees, paymentId }: PurchaseConversionProps) {
  const { reportConversion } = useGoogleAds();

  useEffect(() => {
    reportConversion('purchase', { value: valueRupees, transactionId: paymentId });
  }, [reportConversion, valueRupees, paymentId]);

  return null;
}
