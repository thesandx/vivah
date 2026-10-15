import Link from 'next/link';

import { ContactLink } from '@/components/ui/ContactLink';
import { copyrightLine, isExternalHref } from '@/lib/contact';
import { cn } from '@/lib/utils';

export interface FooterLink {
  /** An in-app path (`/privacy`), or a full URL, `mailto:` or `tel:` link. */
  href: string;
  label: string;
}

export interface FooterProps {
  /** One plain line under the copyright: who runs this, or what we sell. No slogans. */
  children?: React.ReactNode;
  /** The brand name, at the top of the footer. */
  brand?: string;
  /** Only pages that exist. A footer link to a missing page is a broken link. */
  links?: readonly FooterLink[];
  /** A row of icon links, such as `SocialLinks`. */
  social?: React.ReactNode;
  /** Who holds the copyright. Renders `© <year> <owner>`, with the year from the clock. */
  owner?: string;
  /** The first year of the site. The line then shows a range up to this year. */
  since?: number;
  /** A phone number and an email address, rendered as links a phone can tap. */
  contact?: { phone?: string; email?: string };
  className?: string;
}

/**
 * The site footer: quiet, small text, a top outline, everything centred.
 * From top to bottom: the brand, the links, the social icons, the contacts,
 * then the copyright and one plain line.
 *
 * The copyright year is never a literal in the source — see `copyrightLine`.
 */
export function Footer({
  children,
  brand,
  links = [],
  social,
  owner,
  since,
  contact,
  className,
}: FooterProps) {
  const hasContact = contact?.phone !== undefined || contact?.email !== undefined;
  return (
    <footer className={cn('border-line mt-auto border-t-2', className)}>
      <div className="text-small text-ink-soft mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-5 py-10 text-center sm:px-8">
        {brand !== undefined && <p className="font-display text-heading text-ink">{brand}</p>}
        {links.length > 0 && (
          <nav aria-label="Footer">
            <ul className="flex flex-wrap justify-center gap-x-5">
              {links.map((link) => {
                const className =
                  'hover:text-ink decoration-brand inline-flex min-h-11 items-center decoration-2 underline-offset-4 hover:underline';
                return (
                  <li key={link.href}>
                    {isExternalHref(link.href) ? (
                      <a href={link.href} className={className}>
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={className}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        {social}
        {hasContact && (
          <address className="flex flex-wrap justify-center gap-x-4 gap-y-1 not-italic">
            {contact?.phone !== undefined && <ContactLink kind="phone" value={contact.phone} />}
            {contact?.email !== undefined && <ContactLink kind="email" value={contact.email} />}
          </address>
        )}
        {(children !== undefined || owner !== undefined) && (
          <div className="flex flex-col gap-1">
            {owner !== undefined && <p>{copyrightLine(owner, since)}</p>}
            {children !== undefined && <div>{children}</div>}
          </div>
        )}
      </div>
    </footer>
  );
}
