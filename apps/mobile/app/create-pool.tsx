/**
 * Pool creation wizard (FRS §2.1): Vibe → Schedule → Stakes → Review → create.
 * No payment here — the pool is born 'pending' and members pay in later (F5),
 * per the Build Bible. One screen owns the whole draft; steps are presentational.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../src/lib/nav';
import { useCreatePool } from '../src/features/pools/createPool';
import {
  DEFAULT_DRAFT,
  validateSchedule,
  validateStakes,
  validateVibe,
  type PoolDraft,
} from '../src/features/pools/draft';
import { StepReview } from '../src/features/pools/steps/StepReview';
import { StepSchedule } from '../src/features/pools/steps/StepSchedule';
import { StepStakes } from '../src/features/pools/steps/StepStakes';
import { StepVibe } from '../src/features/pools/steps/StepVibe';
import { toast } from '../src/stores/toastStore';
import { Button, haptic, screenX, space, Text, useTheme } from '../src/ui';

const STEPS = ['Vibe', 'Schedule', 'Stakes', 'Review'] as const;
const VALIDATORS = [validateVibe, validateSchedule, validateStakes, () => null];

export default function CreatePoolScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const createPool = useCreatePool();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PoolDraft>(DEFAULT_DRAFT);
  const [showError, setShowError] = useState(false);

  const update = (patch: Partial<PoolDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const stepError = VALIDATORS[step]!(draft);

  const back = () => {
    setShowError(false);
    if (step === 0) {
      goBack();
    } else {
      setStep((s) => s - 1);
    }
  };

  const next = () => {
    if (stepError) {
      setShowError(true);
      haptic.warning();
      return;
    }
    setShowError(false);
    setStep((s) => s + 1);
  };

  const submit = () => {
    const err = validateVibe(draft) ?? validateSchedule(draft) ?? validateStakes(draft);
    if (err) {
      toast.error('Check your pool settings', err);
      return;
    }
    createPool.mutate(draft, {
      onSuccess: (created) => {
        haptic.success();
        router.replace({
          pathname: '/pool-created',
          params: { code: created.invite_code, name: created.name, id: created.id },
        });
      },
      onError: (err) => {
        haptic.error();
        // Surface the real reason so failures are diagnosable, not generic.
        const e = err as { message?: string; code?: string; details?: string };
        console.warn('[createPool] failed', { code: e.code, message: e.message, details: e.details });
        const reason =
          e.code === '42501' || /row-level security|jwt|token/i.test(e.message ?? '')
            ? 'Sign-in was rejected. Check this phone’s date & time are set to Automatic, then sign out and back in.'
            : (e.message ?? 'Please try again.');
        toast.error('Could not create pool', reason);
      },
    });
  };

  const isLast = step === STEPS.length - 1;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: screenX }}>
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.md }}
        >
          <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
          <Text variant="footnote" color="secondary">
            Step {step + 1} of {STEPS.length}
          </Text>
        </Pressable>

        {/* Progress segments */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: space.lg }}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= step ? theme.ember : theme.glassBorderStrong,
              }}
            />
          ))}
        </View>

        <Text variant="title1">
          {step === 0 && 'Name your challenge'}
          {step === 1 && 'Set the schedule'}
          {step === 2 && 'Set the stakes'}
          {step === 3 && 'Review & create'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screenX,
          paddingTop: space.lg,
          paddingBottom: space.xl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          {step === 0 && <StepVibe draft={draft} update={update} />}
          {step === 1 && <StepSchedule draft={draft} update={update} />}
          {step === 2 && <StepStakes draft={draft} update={update} />}
          {step === 3 && <StepReview draft={draft} update={update} />}
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: screenX,
          paddingBottom: insets.bottom + space.sm,
          paddingTop: space.sm,
          borderTopWidth: 1,
          borderTopColor: theme.glassBorder,
          gap: 6,
        }}
      >
        {showError && stepError ? (
          <Text variant="footnote" color="blood" style={{ textAlign: 'center' }}>
            {stepError}
          </Text>
        ) : null}
        <Button
          label={isLast ? 'Create Pool' : 'Continue'}
          fullWidth
          loading={createPool.isPending}
          disabled={!!stepError && showError}
          onPress={isLast ? submit : next}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
