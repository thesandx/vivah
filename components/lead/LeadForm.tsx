'use client';

import { useState } from 'react';

import { PhoneNumberInput } from '@/components/auth/PhoneNumberInput';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FieldError } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { DEFAULT_DIAL_COUNTRY } from '@/lib/phone';
import { cn } from '@/lib/utils';

/**
 * The home page form: two names, the date, a WhatsApp number. A Client
 * Component because it holds state and handles submit; the page around it
 * stays a Server Component.
 *
 * It posts to `POST /api/leads`, which validates everything again with
 * `lib/lead-schema.ts`. The browser checks here are a courtesy for a fast
 * answer. The server's checks are the ones that count, and each field error
 * it returns is shown under its input.
 *
 * Until the WhatsApp templates are approved, a success opens the preview link
 * at once, in this browser — which also makes this browser the one the
 * preview is bound to.
 */

/** The longest a name may be. Must match MAX_NAME_LENGTH in lib/lead-schema.ts. */
const MAX_NAME_LENGTH = 60;

type FieldErrors = Partial<Record<'bride' | 'groom' | 'weddingDate' | 'phone' | 'consent', string>>;

interface ErrorBody {
  message?: string;
  fields?: Record<string, string>;
}

export interface LeadFormProps {
  className?: string;
}

export function LeadForm({ className }: LeadFormProps): React.JSX.Element {
  const [bride, setBride] = useState('');
  const [groom, setGroom] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [dateLater, setDateLater] = useState(false);
  const [country, setCountry] = useState(DEFAULT_DIAL_COUNTRY);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');

  const [status, setStatus] = useState<'idle' | 'working' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus('working');
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bride,
          groom,
          weddingDate: dateLater || weddingDate === '' ? null : weddingDate,
          countryIso: country,
          phone,
          consent,
          ...(website !== '' && { website }),
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ErrorBody;
        setFieldErrors((body.fields ?? {}) as FieldErrors);
        throw new Error(body.message ?? `The request failed with status ${response.status}.`);
      }

      const { previewPath } = (await response.json()) as { previewPath: string };
      setStatus('done');
      window.location.assign(previewPath);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.name !== 'TimeoutError'
          ? caught.message
          : 'The request took too long. Check your connection and try again.',
      );
      setStatus('idle');
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className={cn('flex w-full flex-col gap-4', className)}
      noValidate
    >
      <Input
        label="Bride's name"
        name="bride"
        autoComplete="off"
        value={bride}
        onChange={(event) => setBride(event.target.value)}
        maxLength={MAX_NAME_LENGTH}
        required
        {...(fieldErrors.bride !== undefined && { error: fieldErrors.bride })}
      />
      <Input
        label="Groom's name"
        name="groom"
        autoComplete="off"
        value={groom}
        onChange={(event) => setGroom(event.target.value)}
        maxLength={MAX_NAME_LENGTH}
        required
        {...(fieldErrors.groom !== undefined && { error: fieldErrors.groom })}
      />
      <Input
        label="Wedding date"
        name="weddingDate"
        type="date"
        value={dateLater ? '' : weddingDate}
        disabled={dateLater}
        onChange={(event) => setWeddingDate(event.target.value)}
        {...(fieldErrors.weddingDate !== undefined && { error: fieldErrors.weddingDate })}
      />
      <Checkbox
        label="I'll add the date later"
        checked={dateLater}
        onChange={(event) => setDateLater(event.target.checked)}
      />
      <PhoneNumberInput
        label="WhatsApp number"
        country={country}
        onCountryChange={setCountry}
        value={phone}
        onChange={setPhone}
        error={fieldErrors.phone}
      />
      <Checkbox
        label="Send my preview on WhatsApp"
        hint="We use this number only for your invite."
        checked={consent}
        onChange={(event) => setConsent(event.target.checked)}
      />
      {fieldErrors.consent !== undefined && (
        <FieldError id="lead-consent-error">{fieldErrors.consent}</FieldError>
      )}

      {/* Honeypot: hidden from people and from screen readers, so only a bot fills it. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      {status === 'done' && <Alert tone="success" title="Preview created. Opening it now." />}
      {error !== null && (
        <Alert tone="danger" title="Your preview was not created.">
          {error}
        </Alert>
      )}

      <Button type="submit" variant="primary" block disabled={status !== 'idle'}>
        {status === 'working' ? 'Creating your preview' : 'See my invite'}
      </Button>
    </form>
  );
}
