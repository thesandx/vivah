'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * Copies a link to the clipboard and says so. `'use client'` for the
 * Clipboard API and the "Copied" state.
 */

export interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = 'Copy link' }: CopyButtonProps): React.JSX.Element {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

  return (
    <Button
      variant="secondary"
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => setCopied('copied'),
          () => setCopied('failed'),
        );
      }}
    >
      <span aria-live="polite">
        {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy failed. Select it.' : label}
      </span>
    </Button>
  );
}
