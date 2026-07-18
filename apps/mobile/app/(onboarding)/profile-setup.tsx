/**
 * Profile setup (FRS §1.2, UC-01 steps 8–10): claim name + username, optional
 * avatar, explicit 18+ confirmation. Completing stamps onboarded_at — the
 * root guard holds every new account here until identity is claimed.
 */
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  isUsernameTaken,
  suggestUsernames,
  validateName,
  validateUsername,
} from '../../src/features/auth/username';
import { useProfile } from '../../src/features/auth/useProfile';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { toast } from '../../src/stores/toastStore';
import {
  Avatar,
  Button,
  Chip,
  fonts,
  haptic,
  Input,
  screenX,
  space,
  Text,
  useTheme,
} from '../../src/ui';

type UsernameState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function ProfileSetupScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: profile } = useProfile();

  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [firstError, setFirstError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState<UsernameState>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarB64, setAvatarB64] = useState<string | null>(null);
  const [avatarMime, setAvatarMime] = useState('image/jpeg');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live availability check against the profiles view.
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (username.length === 0) {
      setUsernameState('idle');
      setUsernameError(null);
      return;
    }
    const invalid = validateUsername(username);
    if (invalid) {
      setUsernameState('invalid');
      setUsernameError(invalid);
      return;
    }
    setUsernameState('checking');
    setUsernameError(null);
    checkTimer.current = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(username);
        // Their own placeholder counts as theirs.
        if (taken && username !== profile?.username) {
          setUsernameState('taken');
          setUsernameError('Already taken');
          setSuggestions(await suggestUsernames(first || 'conqr', last || username));
        } else {
          setUsernameState('available');
          setSuggestions([]);
        }
      } catch {
        setUsernameState('idle'); // network hiccup — final check happens on submit
      }
    }, 400);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [username, first, last, profile?.username]);

  const pickAvatar = async () => {
    haptic.tap();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      // RN cannot reliably turn a file URI into upload bytes via fetch/Blob
      // (that path uploads 0 bytes) — take base64 straight from the picker.
      base64: true,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      setAvatarUri(asset.uri);
      setAvatarB64(asset.base64 ?? null);
      setAvatarMime(asset.mimeType ?? 'image/jpeg');
    }
  };

  const canSubmit =
    !validateName(first) && !validateName(last) && usernameState === 'available' && ageConfirmed;

  const submit = async () => {
    if (!session || saving) return;
    const fErr = validateName(first);
    const lErr = validateName(last);
    setFirstError(fErr);
    setLastError(lErr);
    if (fErr || lErr || usernameState !== 'available' || !ageConfirmed) return;

    setSaving(true);
    try {
      // Optional avatar upload — failure never blocks onboarding.
      let avatarUrl: string | null = null;
      if (avatarB64) {
        try {
          const bytes = Uint8Array.from(atob(avatarB64), (c) => c.charCodeAt(0));
          if (bytes.byteLength === 0) throw new Error('empty avatar payload');
          if (bytes.byteLength > 2 * 1024 * 1024) {
            toast.info('Avatar too large', 'Max 2MB — pick a smaller photo');
            throw new Error('avatar too large');
          }
          const ext = avatarMime === 'image/png' ? 'png' : avatarMime === 'image/webp' ? 'webp' : 'jpg';
          const path = `${session.user.id}/avatar.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('avatars')
            .upload(path, bytes.buffer, { contentType: avatarMime, upsert: true });
          if (upErr) throw upErr;
          avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
        } catch (e) {
          if ((e as Error).message !== 'avatar too large') {
            toast.info('Avatar upload failed', 'You can add it later from Profile');
          }
          avatarUrl = null;
        }
      }

      const display = `${first.trim()} ${last.trim()}`;
      const { error } = await supabase
        .from('users')
        .update({
          display_name: display,
          username,
          ...(avatarUrl && { avatar_url: avatarUrl }),
          onboarded_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        if (error.code === '23505') {
          // Sniped between check and submit (UC-01 9a).
          haptic.error();
          setUsernameState('taken');
          setUsernameError('Just got taken — try another');
          setSuggestions(await suggestUsernames(first, last));
          return;
        }
        throw error;
      }

      haptic.success();
      toast.success(`Welcome, ${first.trim()}!`, 'Ab discipline dikhao 🔥');
      // Guard watches the profile — refetch routes us into the app.
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) {
      console.warn('[onboarding] save failed:', (e as { code?: string }).code);
      haptic.error();
      toast.error('Could not save your profile', 'Check your connection and try again');
    } finally {
      setSaving(false);
    }
  };

  const previewName = `${first.trim()} ${last.trim()}`.trim() || 'You';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screenX,
          paddingTop: insets.top + space.xxl,
          paddingBottom: insets.bottom + space.xl,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title1">Claim your identity</Text>
        <Text variant="body" color="secondary" style={{ marginTop: space.xxs }}>
          This is how your pool sees you — on the feed, the leaderboard, and the Wall of Shame.
        </Text>

        <Pressable
          onPress={pickAvatar}
          accessibilityRole="button"
          accessibilityLabel="Choose profile photo"
          style={{ alignSelf: 'center', marginTop: space.xl, marginBottom: space.lg }}
        >
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
            />
          ) : (
            <Avatar name={previewName} size="xl" />
          )}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: theme.ember,
              borderWidth: 2,
              borderColor: theme.canvas,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, lineHeight: 18 }}>＋</Text>
          </View>
        </Pressable>

        <View style={{ gap: space.md }}>
          <Input
            label="First name"
            value={first}
            onChangeText={(t) => {
              setFirst(t);
              if (firstError) setFirstError(validateName(t));
            }}
            error={firstError}
            placeholder="Avanish"
            autoComplete="given-name"
            maxLength={30}
            autoFocus
          />
          <Input
            label="Last name"
            value={last}
            onChangeText={(t) => {
              setLast(t);
              if (lastError) setLastError(validateName(t));
            }}
            error={lastError}
            placeholder="Jha"
            autoComplete="family-name"
            maxLength={30}
          />
          <View style={{ gap: 6 }}>
            <Input
              label="Username"
              prefix="@"
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
              error={usernameState === 'taken' || usernameState === 'invalid' ? usernameError : null}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {usernameState === 'checking' && (
              <Text variant="footnote" color="muted">
                Checking availability…
              </Text>
            )}
            {usernameState === 'available' && (
              <Text variant="footnote" color="mint">
                ✓ @{username} is yours if you want it
              </Text>
            )}
            {suggestions.length > 0 && (
              <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap', marginTop: 2 }}>
                {suggestions.map((s) => (
                  <Chip key={s} label={`@${s}`} onPress={() => setUsername(s)} />
                ))}
              </View>
            )}
          </View>
        </View>

        <Pressable
          onPress={() => {
            haptic.select();
            setAgeConfirmed((v) => !v);
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ageConfirmed }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: ageConfirmed ? theme.ember : theme.glassBorderStrong,
              backgroundColor: ageConfirmed ? theme.ember : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {ageConfirmed && (
              <Text style={{ fontSize: 14, lineHeight: 18, color: theme.textOnAccent, fontFamily: fonts.textBold }}>
                ✓
              </Text>
            )}
          </View>
          <Text variant="footnote" color="secondary" style={{ flex: 1 }}>
            I confirm I am 18 or older. Real money is involved — CONQR is strictly 18+.
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />
        <Button
          label="Enter CONQR"
          fullWidth
          loading={saving}
          disabled={!canSubmit}
          onPress={submit}
          style={{ marginTop: space.xl }}
        />
        <Button
          label="Sign out"
          variant="ghost"
          size="md"
          onPress={() => void signOut()}
          style={{ alignSelf: 'center', marginTop: space.xs }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
