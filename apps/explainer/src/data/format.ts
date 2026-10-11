/**
 * INR formatting with Indian digit grouping (1,18,800), implemented by hand
 * so the output never depends on the renderer's ICU build. Amounts are paise.
 */
const MINUS = '−';

const groupIndian = (n: number): string => {
  const s = String(n);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
};

export interface InrOptions {
  /** 'auto' shows paise only when non-zero. */
  readonly paise?: 'auto' | 'always' | 'never';
  /** Prefix + for positive values. */
  readonly signed?: boolean;
}

export const formatINR = (paiseAmount: number, opts: InrOptions = {}): string => {
  const { paise = 'auto', signed = false } = opts;
  const neg = paiseAmount < 0;
  const abs = Math.round(Math.abs(paiseAmount));
  const rupees = Math.floor(abs / 100);
  const p = abs % 100;
  const showPaise = paise === 'always' || (paise === 'auto' && p !== 0);
  const body = `₹${groupIndian(rupees)}${showPaise ? `.${String(p).padStart(2, '0')}` : ''}`;
  if (neg) return `${MINUS}${body}`;
  return signed ? `+${body}` : body;
};

export const rupees = (r: number): number => Math.round(r * 100);

/** "23:13:04" from seconds after midnight. */
export const clockLabel = (secondsOfDay: number, withSeconds = true): string => {
  const s = Math.floor(secondsOfDay);
  const hh = String(Math.floor(s / 3600) % 24).padStart(2, '0');
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return withSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
};

/** "04:12" mm:ss countdown, clamped at zero. */
export const countdownLabel = (secondsLeft: number): string => {
  const s = Math.max(0, Math.ceil(secondsLeft));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
