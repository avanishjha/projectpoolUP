/**
 * Check-in camera (F3.1/F3.2, FRS §3.1): camera opens immediately, NO gallery
 * access — that's the anti-cheat premise. Random liveness prompt overlays the
 * viewfinder. Capture → preview (retake / caption / blur warning) → submit.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SwitchCamera, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../../src/lib/nav';
import { usePoolDetail } from '../../src/features/pools/usePoolDetail';
import { maybeLivenessPrompt } from '../../src/features/checkins/liveness';
import {
  BLUR_WARN_THRESHOLD,
  compressForUpload,
  estimateBlur,
} from '../../src/features/checkins/image';
import { submitErrorCopy, useSubmitCheckIn } from '../../src/features/checkins/useCheckIn';
import { useAuthStore } from '../../src/stores/authStore';
import { toast } from '../../src/stores/toastStore';
import { Button, haptic, Input, screenX, space, Text, useTheme } from '../../src/ui';

export default function CheckInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { poolId } = useLocalSearchParams<{ poolId: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: pool } = usePoolDetail(poolId);
  const submit = useSubmitCheckIn();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [prompt, setPrompt] = useState<string | null>(null);

  const [shot, setShot] = useState<{ uri: string; capturedAt: Date } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [caption, setCaption] = useState('');
  const [blur, setBlur] = useState<number | null>(null);
  const [payload, setPayload] = useState<{ base64: string; bytes: number } | null>(null);

  // Roll the liveness challenge once, when we know the stakes.
  useEffect(() => {
    if (pool && prompt === null) setPrompt(maybeLivenessPrompt(pool.fine_amount));
  }, [pool, prompt]);

  const capture = async () => {
    if (!cameraRef.current || processing) return;
    haptic.tap();
    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      if (!photo?.uri) throw new Error('capture failed');
      const capturedAt = new Date();
      setShot({ uri: photo.uri, capturedAt });
      const [processed, blurScore] = await Promise.all([
        compressForUpload(photo.uri),
        estimateBlur(photo.uri),
      ]);
      setPayload({ base64: processed.base64, bytes: processed.bytes });
      setBlur(blurScore);
      if (blurScore !== null && blurScore > BLUR_WARN_THRESHOLD) haptic.warning();
    } catch {
      haptic.error();
      toast.error('Camera error', 'Could not take the photo. Try again.');
    } finally {
      setProcessing(false);
    }
  };

  const retake = () => {
    haptic.tap();
    setShot(null);
    setPayload(null);
    setBlur(null);
    setCaption('');
  };

  const post = () => {
    if (!shot || !payload || !poolId || !userId) return;
    if (payload.bytes > 1024 * 1024) {
      toast.error('Photo too large', 'Please retake — the image could not be compressed enough.');
      return;
    }
    submit.mutate(
      {
        poolId,
        userId,
        base64: payload.base64,
        caption,
        livenessPrompt: prompt,
        blurScore: blur,
        capturedAt: shot.capturedAt,
      },
      {
        onSuccess: (result) => {
          haptic.success();
          router.replace({
            pathname: '/checkin-success',
            params: {
              poolId,
              streak: String(result.currentStreak),
              replaced: result.replaced ? '1' : '0',
              poolName: result.poolName,
            },
          });
        },
        onError: (err) => {
          haptic.error();
          toast.error('Check-in failed', submitErrorCopy((err as Error).message));
        },
      },
    );
  };

  // ── Permission gate ────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.textMuted} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.canvas,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space.xxl,
          gap: space.xs,
        }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 44, lineHeight: 52 }}>📸</Text>
        <Text variant="title2" style={{ textAlign: 'center' }}>
          Camera access needed
        </Text>
        <Text variant="body" color="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
          CONQR check-ins are camera-only — no gallery uploads. That’s what keeps everyone honest.
        </Text>
        <Button label="Allow camera" onPress={requestPermission} style={{ marginTop: space.lg }} />
        <Button label="Not now" variant="ghost" size="md" onPress={() => goBack()} />
      </View>
    );
  }

  // ── Preview & submit ───────────────────────────────────────────────────
  if (shot) {
    const blurry = blur !== null && blur > BLUR_WARN_THRESHOLD;
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: '#000' }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Image source={{ uri: shot.uri }} style={{ flex: 1 }} resizeMode="cover" />

        <View
          style={{
            position: 'absolute',
            top: insets.top + space.xs,
            left: screenX,
            right: screenX,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            onPress={retake}
            accessibilityRole="button"
            accessibilityLabel="Retake"
            hitSlop={12}
            style={{
              paddingHorizontal: space.md,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(0,0,0,0.55)',
            }}
          >
            <Text style={{ color: '#FFF' }}>Retake</Text>
          </Pressable>
          {payload ? (
            <View
              style={{
                paddingHorizontal: space.sm,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.55)',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 12 }}>
                {Math.round(payload.bytes / 1024)} KB
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: screenX,
            paddingBottom: insets.bottom + space.md,
            paddingTop: space.md,
            backgroundColor: 'rgba(0,0,0,0.72)',
            gap: space.sm,
          }}
        >
          {blurry && (
            <Text variant="footnote" style={{ color: theme.blood }}>
              This photo looks blurry — consider retaking it.
            </Text>
          )}
          <Input
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption (optional)"
            maxLength={200}
            containerStyle={{ marginBottom: 0 }}
          />
          <Button
            label={submit.isPending ? 'Posting…' : 'Post check-in'}
            fullWidth
            loading={submit.isPending}
            disabled={!payload || payload.bytes > 1024 * 1024}
            onPress={post}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Camera ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView ref={cameraRef} facing={facing} style={{ flex: 1 }} />

      {/* Top bar */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + space.xs,
          left: screenX,
          right: screenX,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={() => goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} color="#FFF" strokeWidth={2.2} />
        </Pressable>
        <Text style={{ color: '#FFF', fontSize: 13 }} numberOfLines={1}>
          {pool?.name ?? ''}
        </Text>
        <Pressable
          onPress={() => {
            haptic.select();
            setFacing((f) => (f === 'back' ? 'front' : 'back'));
          }}
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
          hitSlop={12}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
        >
          <SwitchCamera size={20} color="#FFF" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Liveness challenge */}
      {prompt && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 64,
            left: screenX,
            right: screenX,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.xs,
              borderRadius: 999,
              backgroundColor: 'rgba(217,91,63,0.92)',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 14, lineHeight: 19 }}>{prompt}</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, lineHeight: 15, marginTop: 6 }}>
            Liveness check — include this in your photo
          </Text>
        </View>
      )}

      {/* Shutter */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + space.xl,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={capture}
          disabled={processing}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          style={{
            width: 74,
            height: 74,
            borderRadius: 37,
            borderWidth: 4,
            borderColor: 'rgba(255,255,255,0.9)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {processing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF' }} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
