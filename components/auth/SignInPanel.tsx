'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppBar } from '@/components/layout/AppBar';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { DEFAULT_DIAL_COUNTRY, formatPhoneForDisplay, toE164 } from '@/lib/phone';
import { cn } from '@/lib/utils';

import { OtpInput } from './OtpInput';
import { PhoneNumberInput } from './PhoneNumberInput';

/**
 * The sign-in screen, phone OTP only. Google sign-in is for `/admin`
 * alone (ADR-0008), so it is not offered here.
 *
 * Built to behave like an app's: an on-screen back arrow,
 * one task per step, and the country code already filled in.
 *
 * Two steps — the phone number, then the OTP — on one route. The back arrow
 * walks the steps before it leaves the screen, as a native flow does, and the
 * number the person typed survives a trip back to correct it.
 *
 * `'use client'` is justified: state, submit handlers, and the Firebase SDK,
 * which only runs in a browser. The page around it stays a Server Component.
 */

/** Where Firebase mounts the invisible reCAPTCHA. Must exist before it runs. */
const RECAPTCHA_CONTAINER_ID = 'firebase-recaptcha';

/** How long before "Resend OTP" unlocks. Each SMS costs money; see docs/auth.md. */
export const RESEND_AFTER_SECONDS = 30;

/** Firebase phone auth always sends a 6-digit code. */
const OTP_LENGTH = 6;

const STEP_MOTION = {
  none: '',
  next: 'animate-slide-in-next',
  back: 'animate-slide-in-back',
} as const;

export interface SignInPanelProps {
  /** Where to send the user after a successful sign-in. */
  redirectTo?: string;
  /**
   * The last two digits of the number to use, when the person arrived from
   * "Edit details" on their live invite: "Use the number ending in 35".
   */
  phoneHintDigits?: string;
}

export function SignInPanel({
  redirectTo = '/',
  phoneHintDigits,
}: SignInPanelProps): React.JSX.Element {
  const router = useRouter();
  const auth = useFirebaseAuth({ warm: true });

  const [view, setView] = useState<'phone' | 'otp'>('phone');
  const [country, setCountry] = useState(DEFAULT_DIAL_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [e164, setE164] = useState('');
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  // Which way the last step change went. `none` on first render, so the first
  // screen paints in place and Largest Contentful Paint is not delayed.
  const [direction, setDirection] = useState<'none' | 'next' | 'back'>('none');

  const busy = auth.step === 'working';

  // Counts down to the resend unlock. One interval per OTP step, cleared on leave.
  useEffect(() => {
    if (view !== 'otp' || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [view, secondsLeft]);

  function finish(succeeded: boolean): void {
    if (!succeeded) return;
    // `refresh` re-renders the Server Components with the new cookie in place,
    // so the destination knows the user on its first render.
    router.replace(redirectTo);
    router.refresh();
  }

  async function sendOtp(number: string): Promise<void> {
    const sent = await auth.sendVerificationCode(number, RECAPTCHA_CONTAINER_ID);
    if (!sent) return;
    setDirection('next');
    setView('otp');
    setOtp('');
    setSecondsLeft(RESEND_AFTER_SECONDS);
  }

  function verify(code: string): void {
    if (busy) return;
    void auth.confirmVerificationCode(code).then(finish);
  }

  function backToPhone(): void {
    auth.reset();
    setOtp('');
    setDirection('back');
    setView('phone');
  }

  if (!auth.available) {
    return (
      <>
        <AppBar title="Sign in" back />
        <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
          <div className="max-w-md">
            <EmptyState title="Sign-in is not set up.">
              Set the Firebase values in <code>.env.example</code> and rebuild the app.
            </EmptyState>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppBar
        title={view === 'otp' ? 'Verify OTP' : 'Sign in'}
        back={view === 'otp' ? { onBack: backToPhone, label: 'Change phone number' } : true}
      />

      {/*
        A focused task. On a phone it fills the screen, like an app's sign-in.
        On a desktop it is one narrow column on the page frame, under the same
        header as every other page: a 1000px-wide phone field helps nobody.
      */}
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex max-w-md flex-col gap-8">
          {/*
          Each step is keyed, so a step change mounts a fresh subtree and the
          slide plays: forward from the right, back from the left, as a native
          navigation stack does.
        */}
          {view === 'phone' ? (
            <div key="phone" className={cn('flex flex-col gap-8', STEP_MOTION[direction])}>
              <header className="flex flex-col gap-2">
                <h2 className="text-title">Enter your phone number</h2>
                <p className="text-ink-soft">We send a one-time password (OTP) to it by SMS.</p>
                {phoneHintDigits !== undefined && (
                  <p className="text-ink">
                    Use the number you paid with. It ends in{' '}
                    <span className="font-semibold">••{phoneHintDigits}</span>.
                  </p>
                )}
              </header>

              <form
                className="flex flex-col gap-5"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  const result = toE164(country, nationalNumber);
                  if (!result.ok) {
                    setPhoneError(result.message);
                    return;
                  }
                  setPhoneError(undefined);
                  setE164(result.e164);
                  void sendOtp(result.e164);
                }}
              >
                <PhoneNumberInput
                  country={country}
                  onCountryChange={setCountry}
                  value={nationalNumber}
                  onChange={(value) => {
                    setNationalNumber(value);
                    setPhoneError(undefined);
                  }}
                  error={phoneError}
                  disabled={busy}
                  autoFocus
                />
                <Button type="submit" size="lg" block disabled={busy}>
                  {busy ? 'Sending OTP…' : 'Send OTP'}
                </Button>
              </form>
            </div>
          ) : (
            <div key="otp" className={cn('flex flex-col gap-8', STEP_MOTION[direction])}>
              <header className="flex flex-col gap-2">
                <h2 className="text-title">Enter the OTP</h2>
                <p className="text-ink-soft">
                  We sent a {OTP_LENGTH}-digit code to{' '}
                  <span className="text-ink font-medium whitespace-nowrap">
                    {formatPhoneForDisplay(e164)}
                  </span>
                  .
                </p>
              </header>

              <form
                className="flex flex-col gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  verify(otp);
                }}
              >
                <OtpInput
                  label="OTP"
                  length={OTP_LENGTH}
                  value={otp}
                  onChange={(digits) => {
                    setOtp(digits);
                    // Verify as soon as the last digit lands, as an SMS autofill expects.
                    if (digits.length === OTP_LENGTH) verify(digits);
                  }}
                  error={auth.error ?? undefined}
                  disabled={busy}
                  autoFocus
                />
                <Button type="submit" size="lg" block disabled={busy || otp.length !== OTP_LENGTH}>
                  {busy ? 'Verifying…' : 'Verify OTP'}
                </Button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {secondsLeft > 0 ? (
                  <p className="text-small text-ink-soft" aria-live="polite">
                    Resend OTP in {secondsLeft}s
                  </p>
                ) : (
                  <Button variant="quiet" disabled={busy} onClick={() => void sendOtp(e164)}>
                    Resend OTP
                  </Button>
                )}
                <Button variant="quiet" disabled={busy} onClick={backToPhone}>
                  Change number
                </Button>
              </div>
            </div>
          )}

          {/* On the OTP step the error belongs to the field, which shakes; see below. */}
          {auth.error !== null && view === 'phone' && <Alert tone="danger" title={auth.error} />}

          {/*
          Firebase mounts the invisible reCAPTCHA widget here. It must be in the
          DOM before `sendVerificationCode` runs, which is why it is rendered
          unconditionally rather than alongside the phone form.
        */}
          <div id={RECAPTCHA_CONTAINER_ID} />

          <p className="text-small text-ink-soft">
            Signing in creates an account if you do not have one.
          </p>
        </div>
      </main>
    </>
  );
}
