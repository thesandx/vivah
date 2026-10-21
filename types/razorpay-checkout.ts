/**
 * What the browser needs to open Razorpay's checkout for one payment. The
 * server makes the Razorpay order and sends this back from the pay button's
 * Server Action; `hooks/usePublishInvite.ts` opens the checkout with it.
 * ADR-0012.
 *
 * Nothing here is secret: the key id is public by design, and the order is
 * worth nothing until Razorpay reports it paid.
 */
export interface RazorpayCheckout {
  /** Our payment document. The confirm step names it. */
  paymentId: string;
  /** The public key id, `rzp_test_...` or `rzp_live_...`. */
  keyId: string;
  /** Razorpay's `order_...` id. */
  orderId: string;
  /** In paise. */
  amount: number;
  currency: 'INR';
  /** The brand name the checkout shows. */
  name: string;
  description: string;
  /** E.164, so the couple does not type their number again. */
  contact: string;
}

/** What Razorpay's checkout hands the page after a payment. */
export interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
