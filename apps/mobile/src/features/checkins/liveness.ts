/**
 * Liveness prompts (FR-CI-02): a random challenge on ~1-in-3 check-ins that a
 * recycled photo can't satisfy. Raised to 1-in-2 for high-stake pools.
 */

export const LIVENESS_PROMPTS = [
  'Show 2 fingers ✌️',
  'Show 3 fingers 🤟',
  'Show a thumbs up 👍',
  'Touch your left ear',
  'Write today’s date on paper',
  'Show your palm ✋',
  'Make a fist 👊',
] as const;

const HIGH_STAKE_FINE = 200;

/** Returns a prompt, or null when this check-in isn't challenged. */
export function maybeLivenessPrompt(fineAmount: number): string | null {
  const chance = fineAmount >= HIGH_STAKE_FINE ? 0.5 : 1 / 3;
  if (Math.random() >= chance) return null;
  const i = Math.floor(Math.random() * LIVENESS_PROMPTS.length);
  return LIVENESS_PROMPTS[i]!;
}
