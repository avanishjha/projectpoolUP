/**
 * Slim connectivity banner — India-first apps treat offline as a normal
 * state, not an error (SRS: patchy 4G is the baseline).
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './Text';

export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  if (!offline) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(160)}
      style={{
        position: 'absolute',
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 999,
      }}
      pointerEvents="none"
    >
      <View
        style={{
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: theme.scheme === 'dark' ? 'rgba(201,87,98,0.16)' : 'rgba(176,71,81,0.10)',
          borderWidth: 1,
          borderColor: theme.shameBorder,
          borderRadius: 999,
          paddingVertical: 6,
          paddingHorizontal: space.md,
          marginTop: space.xs,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.blood }} />
        <Text variant="footnote" color="blood">
          Offline — will sync when you're back
        </Text>
      </View>
    </Animated.View>
  );
}
