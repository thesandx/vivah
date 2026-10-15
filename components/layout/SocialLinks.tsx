import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { mailtoHref } from '@/lib/contact';
import { cn } from '@/lib/utils';

export interface SocialLinksProps {
  /** The Instagram profile URL. */
  instagram?: string;
  /** The Facebook page URL. */
  facebook?: string;
  /** A `https://wa.me/...` chat link. */
  whatsApp?: string;
  /** An email address. Rendered as a `mailto:` link. */
  email?: string;
  className?: string;
}

/**
 * A row of round icon links to our social profiles and contacts. Each link
 * has an `aria-label`, because the icon alone carries no words. Profiles open
 * in a new tab, so the visitor keeps the site open.
 *
 * A Server Component: plain links, no JavaScript.
 */
export function SocialLinks({ instagram, facebook, whatsApp, email, className }: SocialLinksProps) {
  const items = [
    instagram && { href: instagram, label: 'vivah.online on Instagram', icon: <InstagramIcon /> },
    facebook && { href: facebook, label: 'vivah.online on Facebook', icon: <FacebookIcon /> },
    whatsApp && { href: whatsApp, label: 'Chat with us on WhatsApp', icon: <WhatsAppIcon /> },
    email && { href: mailtoHref(email), label: `Email us at ${email}`, icon: <MailIcon /> },
  ].filter((item) => !!item);

  if (items.length === 0) return null;
  return (
    <ul className={cn('flex items-center gap-2', className)}>
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            aria-label={item.label}
            {...(item.href.startsWith('mailto:')
              ? {}
              : { target: '_blank', rel: 'noopener noreferrer' })}
            className="text-ink-soft hover:text-brand rounded-pill inline-flex size-11 items-center justify-center"
          >
            {item.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 stroke-current"
      fill="none"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" className="fill-current" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 stroke-current"
      fill="none"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M14.5 21v-8h3l.5-3.5h-3.5V7.8c0-1 .3-1.8 1.8-1.8H18V3a24 24 0 0 0-2.6-.1c-2.6 0-4.4 1.6-4.4 4.5v2.1H8V13h3v8" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 stroke-current"
      fill="none"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}
