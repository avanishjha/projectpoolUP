/** Explore — public pool discovery (F10.1). Spectator-mode growth surface. */
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DOCK_CLEARANCE } from '../../src/app-shell/FloatingDock';
import { EmptyState, screenX, space, Text } from '../../src/ui';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top + space.lg }}>
      <View style={{ paddingHorizontal: screenX }}>
        <Text variant="title1">Explore</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: DOCK_CLEARANCE }}>
        <EmptyState
          emoji="🧭"
          title="Public pools are coming"
          body="Watch live challenges, follow the drama, and join the next round when you're ready."
        />
      </View>
    </View>
  );
}
