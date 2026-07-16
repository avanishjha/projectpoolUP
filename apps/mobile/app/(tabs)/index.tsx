/** Home — pool dashboard. Real pool cards land with F2.4; the zero state is the launch face. */
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '../../src/stores/toastStore';
import { EmptyState, screenX, space, Text } from '../../src/ui';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top + space.lg }}>
      <View style={{ paddingHorizontal: screenX }}>
        <Text variant="title1">CONQR</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 80 }}>
        <EmptyState
          emoji="🏆"
          title="No pools yet"
          body="Start a challenge with your friends — daily proof, real stakes, winner takes the pot."
          action={{
            label: 'Create a Pool',
            onPress: () => toast.info('Pool creation lands next', 'Feature F2.1 on the build order'),
          }}
          secondaryAction={{
            label: 'Join with invite code',
            onPress: () => toast.info('Pool joining lands next', 'Feature F2.3 on the build order'),
          }}
        />
      </View>
    </View>
  );
}
