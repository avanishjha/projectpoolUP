import { Stack } from 'expo-router';
import { useTheme } from '../../src/ui';

export default function AuthLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.canvas },
        animation: 'slide_from_right',
      }}
    />
  );
}
