import { View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Button, EmptyState, useTheme } from '../src/ui';

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: theme.canvas, justifyContent: 'center' }}>
        <EmptyState
          emoji="🗺️"
          title="Yeh raasta kahin nahi jaata"
          body="This screen doesn't exist. Let's get you back on track."
        />
        <Link href="/" asChild>
          <Button label="Go Home" size="md" style={{ alignSelf: 'center', marginTop: 20 }} />
        </Link>
      </View>
    </>
  );
}
