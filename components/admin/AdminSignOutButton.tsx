'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * Ends the admin session. Only the admin one: a couple's session in the same
 * browser stays. `'use client'` for the request and the pending state.
 */
export function AdminSignOutButton(): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="quiet"
      disabled={pending}
      onClick={() => {
        setPending(true);
        fetch('/api/admin/session', { method: 'DELETE', signal: AbortSignal.timeout(10_000) })
          .catch(() => undefined)
          .finally(() => {
            setPending(false);
            router.refresh();
          });
      }}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
