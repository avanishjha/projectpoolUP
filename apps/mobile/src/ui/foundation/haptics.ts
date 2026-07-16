/**
 * CONQR haptic vocabulary. Fire-and-forget, silently no-ops where
 * unsupported (web, some Androids). Semantic names so call sites read as
 * intent, not hardware.
 */
import * as Haptics from 'expo-haptics';

const fire = (fn: () => Promise<void>) => {
  fn().catch(() => {
    /* haptics unavailable — never let feedback break a flow */
  });
};

export const haptic = {
  /** Every tap on an interactive element. */
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Picker/segment/selection change. */
  select: () => fire(() => Haptics.selectionAsync()),
  /** Check-in posted, pool joined. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Destructive confirm, final-hour warnings. */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Failures. */
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** Money moved — fines, payouts. Deliberately heavier. */
  money: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
} as const;

export type HapticKind = keyof typeof haptic;
