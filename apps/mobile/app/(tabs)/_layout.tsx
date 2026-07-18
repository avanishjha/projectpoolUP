/**
 * The 4-tab structure from HLD §3.2: Home · Explore · Wallet · Profile.
 * Rendered through the floating liquid-glass dock (src/app-shell/FloatingDock)
 * — detached from the screen edge, safe above Android system nav.
 */
import { Tabs } from 'expo-router';
import { Compass, House, User, Wallet } from 'lucide-react-native';
import { FloatingDock } from '../../src/app-shell/FloatingDock';
import { useTheme } from '../../src/ui';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.canvas },
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
