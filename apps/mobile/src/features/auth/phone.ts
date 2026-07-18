/** Indian mobile validation (FRS §1.1): 10 digits, starts 6/7/8/9, +91. */

export interface PhoneOk {
  ok: true;
  /** E.164, e.g. +919876543210 */
  e164: string;
  /** The bare 10 digits for display. */
  national: string;
}

export interface PhoneError {
  ok: false;
  error: string;
}

export function normalizeIndianPhone(raw: string): PhoneOk | PhoneError {
  const digits = raw.replace(/\D/g, '').replace(/^(?:91|091|0)/, '');
  if (digits.length !== 10) {
    return { ok: false, error: 'Enter a 10-digit mobile number' };
  }
  if (!/^[6-9]/.test(digits)) {
    return { ok: false, error: 'Please enter a valid Indian mobile number' };
  }
  return { ok: true, e164: `+91${digits}`, national: digits };
}

/** 98765 43210 — how India reads its own numbers. */
export function formatNational(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}
