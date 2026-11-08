'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ui } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

type Step = { kind: 'idle' } | { kind: 'scan'; factorId: string; qr: string; secret: string };

/**
 * Uključivanje dvostepene prijave (TOTP): QR kod za aplikaciju na telefonu
 * (Google Authenticator, Microsoft Authenticator...), pa potvrda prvim kodom.
 */
export function MfaEnroll() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    // Ukloni ranije započete, nepotvrđene pokušaje
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Telefon',
    });
    setBusy(false);
    if (error || !data) {
      setError('Dvostepena prijava nije pokrenuta. Pokušajte ponovo.');
      return;
    }
    setStep({ kind: 'scan', factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (step.kind !== 'scan') return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: step.factorId,
      code: code.replace(/\s+/g, ''),
    });
    setBusy(false);
    if (error) {
      setError('Kod nije tačan. Unesite novi kod iz aplikacije.');
      return;
    }
    router.replace('/bezbednost?poruka=mfa_ukljucen');
    router.refresh();
  }

  if (step.kind === 'idle') {
    return (
      <div className="space-y-2">
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="button" onClick={start} disabled={busy} className={ui.button}>
          Uključi dvostepenu prijavu
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-700">
        <li>Otvorite aplikaciju za autentifikaciju na telefonu.</li>
        <li>Skenirajte QR kod (ili unesite kod ispod ručno).</li>
        <li>Unesite šestocifreni kod koji aplikacija pokaže.</li>
      </ol>
      {/* QR kod stiže kao SVG data URL od Supabase-a */}
      <img src={step.qr} alt="QR kod za aplikaciju za autentifikaciju" width={180} height={180} />
      <p className="font-mono text-xs break-all text-neutral-600">{step.secret}</p>
      <div className="max-w-48 space-y-1">
        <label htmlFor="mfa-code" className={ui.label}>
          Kod iz aplikacije
        </label>
        <input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          className={`${ui.input} tracking-widest`}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={ui.button}>
        Potvrdi
      </button>
    </form>
  );
}
