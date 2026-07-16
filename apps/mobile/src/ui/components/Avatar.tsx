/**
 * Avatar with the CONQR ring language:
 *   ember — streak alive (fire border)
 *   shame — missed yesterday (crimson border, 24h — per spec §2.5)
 *   gold  — pool winner
 */
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './Text';

type Size = 'sm' | 'md' | 'lg' | 'xl';
type Ring = 'none' | 'ember' | 'shame' | 'gold';

const SIZES: Record<Size, number> = { sm: 32, md: 44, lg: 64, xl: 96 };
const RING_WIDTH: Record<Size, number> = { sm: 1.5, md: 2, lg: 2.5, xl: 3 };

/** Deterministic muted hue per user so initials feel personal, not random. */
const FALLBACK_HUES = ['#44415C', '#3A4E54', '#4E4252', '#40503F', '#524A38', '#3C4760'];
function hueFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_HUES[h % FALLBACK_HUES.length]!;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: Size;
  ring?: Ring;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, uri, size = 'md', ring = 'none', style }: AvatarProps) {
  const theme = useTheme();
  const d = SIZES[size];
  const ringW = RING_WIDTH[size];
  const gap = ring === 'none' ? 0 : ringW + 1.5;
  const inner = d - 2 * gap;

  const face = uri ? (
    <Image source={{ uri }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
  ) : (
    <View
      style={{
        width: inner,
        height: inner,
        borderRadius: inner / 2,
        backgroundColor: hueFor(name),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.displayMedium,
          fontSize: inner * 0.36,
          color: 'rgba(245,245,252,0.95)',
        }}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );

  if (ring === 'none') {
    return <View style={style}>{face}</View>;
  }

  const ringColors =
    ring === 'ember' ? theme.gradients.ember
    : ring === 'gold' ? theme.gradients.gold
    : theme.gradients.shameRing;

  return (
    <LinearGradient
      colors={ringColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { width: d, height: d, borderRadius: d / 2, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <View
        style={{
          width: inner + 3,
          height: inner + 3,
          borderRadius: (inner + 3) / 2,
          backgroundColor: theme.canvas,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {face}
      </View>
    </LinearGradient>
  );
}
