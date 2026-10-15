'use client';

import { Button, type ButtonProps } from '@/components/ui/Button';
import { useSignupDialog } from '@/hooks/useSignupDialog';

export type SignupButtonProps = Omit<ButtonProps, 'onClick' | 'type'>;

/**
 * A button that opens the sign-up dialog, with the heart thread first. Use it
 * inside `SignupDialogProvider`. The label is the caller's, so each section
 * can ask in its own words.
 */
export function SignupButton({ size = 'lg', ...rest }: SignupButtonProps) {
  const { openSignup } = useSignupDialog();
  return <Button size={size} aria-haspopup="dialog" onClick={openSignup} {...rest} />;
}
