/** Challenge templates (FRS §2.1 Screen 1) — pre-fill duration, emoji, copy. */

export type ChallengeType =
  | '75_hard'
  | 'gym_streak'
  | 'run'
  | 'surya_namaskar'
  | 'no_sugar'
  | 'steps'
  | 'meditation'
  | 'cold_plunge'
  | 'custom';

export interface ChallengeTemplate {
  type: ChallengeType;
  label: string;
  emoji: string;
  defaultDuration: number;
  nameSuggestion: string;
  description: string;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  { type: '75_hard', label: '75 Hard', emoji: '💪', defaultDuration: 75, nameSuggestion: '75 Hard Boyz', description: 'No excuses. 75 days of full discipline.' },
  { type: 'gym_streak', label: 'Gym Streak', emoji: '🏋️', defaultDuration: 30, nameSuggestion: 'Daily Gym Squad', description: 'Hit the gym every single day.' },
  { type: 'run', label: 'Daily Run', emoji: '🏃', defaultDuration: 30, nameSuggestion: 'Subah Run Club', description: 'Lace up and run, every day.' },
  { type: 'surya_namaskar', label: 'Surya Namaskar', emoji: '🧘', defaultDuration: 21, nameSuggestion: 'Surya Namaskar Sangh', description: 'Surya Namaskar every morning.' },
  { type: 'no_sugar', label: 'No Sugar', emoji: '🍬', defaultDuration: 30, nameSuggestion: 'No Maida Gang', description: 'No sugar. No cheat days.' },
  { type: 'steps', label: '10K Steps', emoji: '👟', defaultDuration: 30, nameSuggestion: '10K Steps Club', description: '10,000 steps daily. Prove it.' },
  { type: 'meditation', label: 'Meditation', emoji: '🕉️', defaultDuration: 21, nameSuggestion: 'Shaant Mann Club', description: 'Meditate every day.' },
  { type: 'cold_plunge', label: 'Cold Plunge', emoji: '🧊', defaultDuration: 30, nameSuggestion: 'Cold Shower Crew', description: 'Cold shower / plunge, daily.' },
  { type: 'custom', label: 'Custom', emoji: '🔥', defaultDuration: 30, nameSuggestion: '', description: '' },
];

export function templateFor(type: ChallengeType): ChallengeTemplate {
  return CHALLENGE_TEMPLATES.find((t) => t.type === type) ?? CHALLENGE_TEMPLATES[CHALLENGE_TEMPLATES.length - 1]!;
}
