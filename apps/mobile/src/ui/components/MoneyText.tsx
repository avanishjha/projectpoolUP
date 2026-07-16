import type { StyleProp, TextStyle } from 'react-native';
import type { ThemeColorRole } from '../theme/themes';
import { formatINR } from '../utils/formatINR';
import { Text } from './Text';

export interface MoneyTextProps {
  amount: number;
  size?: 'md' | 'lg';
  color?: ThemeColorRole;
  style?: StyleProp<TextStyle>;
}

/** Money is always tabular, always Indian-grouped (₹1,23,456), gold by default. */
export function MoneyText({ amount, size = 'md', color = 'gold', style }: MoneyTextProps) {
  return (
    <Text variant={size === 'lg' ? 'moneyLg' : 'money'} color={color} style={style}>
      {formatINR(amount)}
    </Text>
  );
}
