import { Stack } from 'expo-router';
import { useTheme } from '../../src/ui';

export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.canvas },
        // No back-swipe out of onboarding — identity comes first.
        gestureEnabled: false,
      }}
    />
  );
}
