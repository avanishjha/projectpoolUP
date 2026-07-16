/**
 * The 4-tab structure from HLD §3.2: Home · Explore · Wallet · Profile.
 * Custom glass tab bar — translucent raised surface, hairline top border,
 * ember tint on the active tab, haptic on switch.
 */
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { Compass, House, User, Wallet } from 'lucide-react-native';
import { haptic } from '../../src/ui/foundation/haptics';
import { useTheme } from '../../src/ui';
import { fonts } from '../../src/ui/tokens';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.canvas },
        tabBarActiveTintColor: theme.ember,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.scheme === 'dark' ? 'rgba(20,20,25,0.94)' : 'rgba(255,255,255,0.94)',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.glassBorder,
          elevation: 0,
          height: Platform.OS === 'web' ? 64 : undefined,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.textMedium,
          fontSize: 11,
        },
      }}
      screenListeners={{
        tabPress: () => haptic.select(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
