/**
 * CONQR design-system gallery — the living style guide. Not shipped to users;
 * this is where every primitive is judged (in BOTH themes) before it may
 * appear in a screen.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Avatar,
  Button,
  Chip,
  GlassCard,
  MoneyText,
  ProgressRing,
  screenX,
  Skeleton,
  space,
  Text,
  useTheme,
} from '../../ui';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm, marginBottom: space.xxl }}>
      <Text variant="caption" color="muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ children, wrap = false }: { children: React.ReactNode; wrap?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: wrap ? 'wrap' : 'nowrap' }}>
      {children}
    </View>
  );
}

export interface GalleryScreenProps {
  onToggleTheme: () => void;
}

export function GalleryScreen({ onToggleTheme }: GalleryScreenProps) {
  const theme = useTheme();
  const dark = theme.scheme === 'dark';

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      {/* Ambient warmth — the canvas is never flat, but it whispers */}
      <LinearGradient
        colors={
          dark
            ? ['rgba(214,85,58,0.07)', 'rgba(214,85,58,0.02)', 'rgba(0,0,0,0)']
            : ['rgba(185,74,47,0.05)', 'rgba(185,74,47,0.015)', 'rgba(0,0,0,0)']
        }
        style={{ position: 'absolute', top: -140, left: -100, width: 420, height: 420, borderRadius: 420, pointerEvents: 'none' }}
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: screenX, paddingTop: 72, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text variant="display">CONQR</Text>
            <Text variant="body" color="secondary" style={{ marginTop: space.xxs }}>
              Design system · v0.2
            </Text>
          </View>
          <Chip label={dark ? 'Light' : 'Dark'} emoji={dark ? '☀️' : '🌙'} onPress={onToggleTheme} />
        </View>
        <View style={{ height: space.xxl }} />

        <Section title="The Pot — hero composition">
          <GlassCard strong radius="xl">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
                <Text variant="caption" color="muted">
                  Total pot
                </Text>
                <MoneyText amount={2095} size="lg" />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.mint }} />
                  <Text variant="footnote" color="mint">
                    +₹99 today · kabir missed
                  </Text>
                </View>
              </View>
              <ProgressRing progress={5 / 30} size={84} strokeWidth={7}>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="title2">5</Text>
                  <Text variant="caption" color="muted" style={{ fontSize: 9, letterSpacing: 0.8 }}>
                    of 30
                  </Text>
                </View>
              </ProgressRing>
            </View>
          </GlassCard>
        </Section>

        <Section title="Typography">
          <Text variant="display">Display 40</Text>
          <Text variant="title1">Title One 30</Text>
          <Text variant="title2">Title Two 22</Text>
          <Text variant="headline">Headline 17 — semibold Inter</Text>
          <Text variant="body">Body 15 — Rahul checked in at 6:42 AM. Streak intact.</Text>
          <Text variant="footnote" color="secondary">
            Footnote 13 — pre-debit notice sent 24h before charge.
          </Text>
          <Text variant="caption" color="muted">
            Caption 11 tracked
          </Text>
          <Row>
            <MoneyText amount={125000} size="lg" />
            <MoneyText amount={499} />
          </Row>
        </Section>

        <Section title="Buttons">
          <Button label="Check In Now" fullWidth />
          <Row>
            <Button label="Join Pool" variant="secondary" size="md" />
            <Button label="Share" variant="ghost" size="md" />
            <Button label="Leave" variant="danger" size="md" />
          </Row>
          <Row>
            <Button label="Processing" loading size="md" />
            <Button label="Disabled" disabled size="md" />
          </Row>
        </Section>

        <Section title="Challenge chips">
          <Row wrap>
            <Chip label="75 Hard" emoji="🔥" selected />
            <Chip label="Gym Streak" emoji="🏋️" />
            <Chip label="5K Run" emoji="🏃" />
            <Chip label="No Sugar" emoji="🍬" />
            <Chip label="Surya Namaskar" emoji="🧘" />
          </Row>
        </Section>

        <Section title="Avatars — ring language (streak / shame / winner)">
          <Row>
            <Avatar name="Priya Sharma" size="lg" ring="ember" />
            <Avatar name="Kabir Singh" size="lg" ring="shame" />
            <Avatar name="Meera Nair" size="lg" ring="gold" />
            <Avatar name="Avanish Jha" size="lg" />
            <Avatar name="Rahul Verma" size="md" />
            <Avatar name="Sneha K" size="sm" />
          </Row>
        </Section>

        <Section title="Wall of Shame surface">
          <GlassCard tone="shame">
            <Row>
              <Avatar name="Kabir Singh" size="md" ring="shame" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="headline">Kabir missed yesterday</Text>
                <Text variant="footnote" color="secondary">
                  ₹99 added to the pot. Kya hua bhai?
                </Text>
              </View>
              <MoneyText amount={99} color="blood" />
            </Row>
          </GlassCard>
        </Section>

        <Section title="Skeleton — feed card loading">
          <GlassCard>
            <Row>
              <Skeleton width={44} height={44} radius="pill" />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="55%" height={14} />
                <Skeleton width="35%" height={11} />
              </View>
            </Row>
            <Skeleton height={180} radius="md" style={{ marginTop: space.sm }} />
          </GlassCard>
        </Section>

        <Section title="Palette — accents are information, not decoration">
          <Row wrap>
            {(
              [
                ['ember', theme.ember],
                ['gold', theme.gold],
                ['mint', theme.mint],
                ['blood', theme.blood],
                ['violet', theme.violet],
              ] as const
            ).map(([name, hex]) => (
              <View key={name} style={{ alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: hex,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.glassBorderStrong,
                  }}
                />
                <Text variant="caption" color="muted" style={{ fontSize: 9 }}>
                  {name}
                </Text>
              </View>
            ))}
          </Row>
        </Section>
      </ScrollView>
    </View>
  );
}
