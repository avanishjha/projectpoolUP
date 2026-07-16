/** Circular progress with a muted ember gradient stroke — streaks, pool progress. */
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export interface ProgressRingProps extends PropsWithChildren {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  tone?: 'ember' | 'gold' | 'mint';
}

export function ProgressRing({
  progress,
  size = 72,
  strokeWidth = 6,
  tone = 'ember',
  children,
}: ProgressRingProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const colors =
    tone === 'ember' ? theme.gradients.ember
    : tone === 'gold' ? theme.gradients.gold
    : ([theme.mint, theme.mint, theme.mint] as const);
  const gradId = `ring-${tone}-${theme.scheme}`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="0.55" stopColor={colors[1]} />
            <Stop offset="1" stopColor={colors[2]} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - clamped)}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
}
