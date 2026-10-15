'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { maskPhone } from '@/lib/admin-cookie';

/**
 * The admin's two-step sign-in (ADR-0008): Google first, then an OTP to the
 * admin phone. Each step posts its ID token to `/api/admin/session`, which
 * makes every decision. This component only drives the Firebase SDK.
 *
 * `'use client'` is justified: state, handlers and the Firebase SDK, which
 * runs only in a browser.
 */

const RECAPTCHA_CONTAINER_ID = 'admin-recaptcha';
const OTP_LENGTH = 6;
const RESEND_AFTER_SECONDS = 30;

async function readMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const { message } = body as { message: unknown };
      if (typeof message === 'string' && message !== '') return message;
    }
  } catch {
    // A non-JSON body gets the generic line below.
  }
  return 'Sign-in failed. Try again.';
}

async function postStep(
  step: 'google' | 'otp',
  idToken: string,
): Promise<{ ok: true; body: unknown } | { ok: false; message: string }> {
  const response = await fetch('/api/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, idToken }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return { ok: false, message: await readMessage(response) };
  return { ok: true, body: await response.json() };
}

export interface AdminSignInProps {
  /**
   * The admin phone, when this browser already passed the Google step and
   * waits for the OTP. `null` starts at the Google step.
   */
  pendingPhoneE164: string | null;
}

export function AdminSignIn({ pendingPhoneE164 }: AdminSignInProps): React.JSX.Element {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(pendingPhoneE164);
  const [view, setView] = useState<'google' | 'send' | 'otp'>(
    pendingPhoneE164 === null ? 'google' : 'send',
  );
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  const exchangeIdToken = useCallback(
    async (idToken: string): Promise<string | null> => {
      const result = await postStep(view === 'google' ? 'google' : 'otp', idToken);
      if (!result.ok) return result.message;
      if (view === 'google') {
        const body = result.body as { phoneE164?: unknown };
        if (typeof body.phoneE164 !== 'string') return 'Sign-in failed. Try again.';
        setPhone(body.phoneE164);
      }
      return null;
    },
    [view],
  );

  const auth = useFirebaseAuth({ warm: true, exchangeIdToken });
  const busy = auth.step === 'working';

  useEffect(() => {
    if (view !== 'otp' || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [view, secondsLeft]);

  async function google(): Promise<void> {
    if (await auth.signInWithGoogle()) {
      // The Google user is not needed in this browser any more: the server
      // holds the pending step. Clearing it keeps the phone sign-in clean.
      await auth.signOutClient();
      setView('send');
    }
  }

  async function sendOtp(): Promise<void> {
    if (phone === null) return;
    if (await auth.sendVerificationCode(phone, RECAPTCHA_CONTAINER_ID)) {
      setView('otp');
      setOtp('');
      setSecondsLeft(RESEND_AFTER_SECONDS);
    }
  }

  function verify(code: string): void {
    if (busy) return;
    void auth.confirmVerificationCode(code).then(async (ok) => {
      if (!ok) return;
      await auth.signOutClient();
      router.refresh();
    });
  }

  function restart(): void {
    auth.reset();
    setOtp('');
    setPhone(null);
    setView('google');
  }

  if (!auth.available) {
    return <Alert tone="danger" title="Sign-in is not set up for this deployment." />;
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <ol className="text-small text-ink-soft flex gap-4" aria-label="Sign-in steps">
        <li className={view === 'google' ? 'text-ink font-semibold' : undefined}>1. Google</li>
        <li className={view === 'google' ? undefined : 'text-ink font-semibold'}>2. OTP</li>
      </ol>

      {view === 'google' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-heading">Sign in with the admin Google account</h2>
          <Button size="lg" block disabled={busy} onClick={() => void google()}>
            {busy ? 'Checking…' : 'Continue with Google'}
          </Button>
        </div>
      )}

      {view === 'send' && phone !== null && (
        <div className="flex flex-col gap-4">
          <h2 className="text-heading">Google account checked</h2>
          <p className="text-ink-soft">
            Now we send an OTP to the admin phone,{' '}
            <span className="text-ink font-medium whitespace-nowrap">{maskPhone(phone)}</span>.
          </p>
          <Button size="lg" block disabled={busy} onClick={() => void sendOtp()}>
            {busy ? 'Sending OTP…' : 'Send OTP'}
          </Button>
        </div>
      )}

      {view === 'otp' && phone !== null && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            verify(otp);
          }}
        >
          <h2 className="text-heading">Enter the OTP</h2>
          <Input
            label="OTP"
            name="otp"
            value={otp}
            {...(auth.error !== null && { error: auth.error })}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
              setOtp(digits);
              if (digits.length === OTP_LENGTH) verify(digits);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            autoFocus
            required
            code
          />
          <Button type="submit" size="lg" block disabled={busy || otp.length !== OTP_LENGTH}>
            {busy ? 'Verifying…' : 'Verify OTP'}
          </Button>
          {secondsLeft > 0 ? (
            <p className="text-small text-ink-soft" aria-live="polite">
              Resend OTP in {secondsLeft}s
            </p>
          ) : (
            <Button variant="quiet" disabled={busy} onClick={() => void sendOtp()}>
              Resend OTP
            </Button>
          )}
        </form>
      )}

      {auth.error !== null && view !== 'otp' && <Alert tone="danger" title={auth.error} />}

      {view !== 'google' && (
        <Button variant="quiet" disabled={busy} onClick={restart}>
          Start again
        </Button>
      )}

      {/* Firebase mounts the invisible reCAPTCHA here before it sends an OTP. */}
      <div id={RECAPTCHA_CONTAINER_ID} />
    </div>
  );
}
