import Link from 'next/link';

import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface GuideCtaProps {
  heading: string;
  children: React.ReactNode;
}

/** The one action at the end of a guide: go to the form on the home page. */
export function GuideCta({ heading, children }: GuideCtaProps) {
  return (
    <Card
      tone="brand-soft"
      className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="text-title">{heading}</h2>
        <p>{children}</p>
      </div>
      <div className="shrink-0">
        <Link href="/" className={buttonStyles({ size: 'lg' })}>
          See my invite
        </Link>
      </div>
    </Card>
  );
}
