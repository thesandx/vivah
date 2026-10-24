export interface OfferRibbonProps {
  /** The coupon code, such as `NEW20`. */
  code: string;
  percentOff: number;
  /** Where a tap goes: the sign-up form. */
  href: string;
}

/**
 * The band at the top of the home page: "Use code NEW20 and get 20% off".
 * The admin turns it on and picks the code on `/admin` > Coupons
 * (ADR-0015). It shows only while that coupon works, so it never offers a
 * code the payment sheet would refuse.
 *
 * The whole band is one link to the sign-up form. The code is the only
 * capitals on the page: it is typed as shown, like a room key. A Server
 * Component.
 */
export function OfferRibbon({ code, percentOff, href }: OfferRibbonProps): React.JSX.Element {
  return (
    <a
      href={href}
      data-track-cta="offer-ribbon"
      className="bg-ink text-paper text-small sm:text-body flex min-h-11 w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 px-5 py-2 text-center hover:underline"
    >
      <span>Wedding season offer:</span>{' '}
      <span>
        use code{' '}
        <span className="border-butter text-butter rounded-pill border-2 border-dashed px-2 font-semibold tracking-wide">
          {code}
        </span>{' '}
        and get <span className="text-butter font-semibold">{percentOff}% off</span>
      </span>
    </a>
  );
}
