/**
 * Root error boundary — crashes become a designed moment with a way back,
 * never a white screen. Sentry hook-in lands with F12.7.
 */
import { Component, type PropsWithChildren, type ReactNode } from 'react';
import { View } from 'react-native';
import { Button } from '../ui/components/Button';
import { Text } from '../ui/components/Text';
import { useTheme } from '../ui/theme/ThemeContext';
import { space } from '../ui/tokens';

function CrashScreen({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.xxl,
        gap: space.xs,
      }}
    >
      <Text style={{ fontSize: 44, lineHeight: 52 }}>🧯</Text>
      <Text variant="title2" style={{ textAlign: 'center' }}>
        Kuch toh gadbad hai
      </Text>
      <Text variant="body" color="secondary" style={{ textAlign: 'center', maxWidth: 280 }}>
        Something broke on our side. Your pools and money are safe.
      </Text>
      <Button label="Try Again" size="md" onPress={onRetry} style={{ marginTop: space.lg }} />
    </View>
  );
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    // F12.7: report to Sentry. Never log PII (NFR-SEC-08).
    console.error('[ErrorBoundary]', error);
  }

  private retry = () => this.setState({ hasError: false });

  override render(): ReactNode {
    if (this.state.hasError) {
      return <CrashScreen onRetry={this.retry} />;
    }
    return this.props.children;
  }
}
