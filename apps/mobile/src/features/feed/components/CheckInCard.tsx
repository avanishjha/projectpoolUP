/**
 * A check-in in the feed: author, streak, watermark-free photo (signed URL),
 * caption, liveness badge, reactions, comments entry, report menu.
 */
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { MessageCircle, MoreHorizontal } from 'lucide-react-native';
import {
  Avatar,
  GlassCard,
  haptic,
  radii,
  Skeleton,
  space,
  Text,
  useTheme,
} from '../../../ui';
import { useSignedImage, type FeedRow, type ReactionType } from '../useFeed';
import { ReactionBar } from './ReactionBar';

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CheckInCard({
  row,
  onReact,
  onComment,
  onReport,
}: {
  row: FeedRow;
  onReact: (type: ReactionType) => void;
  onComment: () => void;
  onReport: () => void;
}) {
  const theme = useTheme();
  const { data: signedUrl, isPending } = useSignedImage(row.image_path);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <GlassCard strong radius="xl" padded={false}>
      {/* Author */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md }}>
        <Avatar
          name={row.display_name ?? '?'}
          uri={row.avatar_url}
          size="sm"
          ring={(row.current_streak ?? 0) >= 7 ? 'ember' : 'none'}
        />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {row.display_name}
          </Text>
          <Text variant="footnote" color="secondary">
            {row.current_streak ? `${row.current_streak}d streak · ` : ''}
            {timeAgo(row.created_at)}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            haptic.tap();
            onReport();
          }}
          accessibilityRole="button"
          accessibilityLabel="More options"
          hitSlop={10}
        >
          <MoreHorizontal size={18} color={theme.textMuted} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Photo */}
      <View style={{ aspectRatio: 1, backgroundColor: theme.glassSurface }}>
        {isPending ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={theme.textMuted} />
          </View>
        ) : signedUrl && !imageFailed ? (
          <Image
            source={{ uri: signedUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Text style={{ fontSize: 28, lineHeight: 34 }}>📷</Text>
            <Text variant="footnote" color="muted">
              Photo unavailable
            </Text>
          </View>
        )}

        {row.liveness_prompt ? (
          <View
            style={{
              position: 'absolute',
              top: space.sm,
              left: space.sm,
              paddingHorizontal: space.xs,
              paddingVertical: 4,
              borderRadius: radii.pill,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 11, lineHeight: 15 }}>
              ✓ {row.liveness_prompt}
            </Text>
          </View>
        ) : null}

        {row.is_verified === false ? (
          <View
            style={{
              position: 'absolute',
              top: space.sm,
              right: space.sm,
              paddingHorizontal: space.xs,
              paddingVertical: 4,
              borderRadius: radii.pill,
              backgroundColor: 'rgba(201,87,98,0.9)',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 11, lineHeight: 15 }}>Under review</Text>
          </View>
        ) : null}
      </View>

      {/* Caption + actions */}
      <View style={{ padding: space.md, gap: space.sm }}>
        {row.caption ? <Text variant="body">{row.caption}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ReactionBar mine={row.my_reaction} count={row.reaction_count} onReact={onReact} />
          <Pressable
            onPress={() => {
              haptic.tap();
              onComment();
            }}
            accessibilityRole="button"
            accessibilityLabel="Comments"
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <MessageCircle size={17} color={theme.textMuted} strokeWidth={2} />
            {row.comment_count > 0 ? (
              <Text variant="footnote" color="secondary">
                {row.comment_count}
              </Text>
            ) : null}
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

export function CheckInCardSkeleton() {
  return (
    <GlassCard strong radius="xl" padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md }}>
        <Skeleton width={32} height={32} radius="pill" />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="45%" height={13} />
          <Skeleton width="30%" height={10} />
        </View>
      </View>
      <Skeleton height={220} radius="xs" />
    </GlassCard>
  );
}
