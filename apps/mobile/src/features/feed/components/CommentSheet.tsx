/** Threaded comments (≤3 levels) — where the trash talk lives. */
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  haptic,
  Input,
  screenX,
  Skeleton,
  space,
  Text,
  useTheme,
} from '../../../ui';
import { toast } from '../../../stores/toastStore';
import { useComments, usePostComment, type CommentRow } from '../useFeed';

function CommentItem({ c, onReply }: { c: CommentRow; onReply: (c: CommentRow) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, marginLeft: c.depth * space.lg, paddingVertical: space.xs }}>
      <Avatar name={c.display_name} uri={c.avatar_url} size="sm" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="footnote" color="secondary">
          {c.display_name}
          {c.is_mine ? ' · You' : ''}
        </Text>
        <Text variant="body">{c.body}</Text>
        {c.depth < 2 ? (
          <Pressable onPress={() => onReply(c)} hitSlop={6} accessibilityRole="button">
            <Text variant="caption" color="muted">
              Reply
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function CommentSheet({
  poolId,
  checkInId,
  visible,
  onClose,
}: {
  poolId: string | undefined;
  checkInId: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: comments, isPending } = useComments(checkInId ?? undefined);
  const post = usePostComment(poolId);

  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);

  const send = () => {
    if (!checkInId || !body.trim()) return;
    post.mutate(
      { checkInId, body, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          haptic.success();
          setBody('');
          setReplyTo(null);
        },
        onError: (err) => {
          haptic.error();
          const msg = (err as Error).message;
          toast.error(
            'Could not post',
            msg === 'members_only' ? 'Only pool members can comment.' : 'Please try again.',
          );
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: theme.raised,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '85%',
              paddingBottom: insets.bottom + space.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: screenX,
                paddingVertical: space.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.glassBorder,
              }}
            >
              <Text variant="headline">Comments</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <X size={20} color={theme.textMuted} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: screenX, paddingVertical: space.sm }}
              keyboardShouldPersistTaps="handled"
            >
              {isPending ? (
                <View style={{ gap: space.sm }}>
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                </View>
              ) : comments && comments.length > 0 ? (
                comments.map((c) => <CommentItem key={c.id} c={c} onReply={setReplyTo} />)
              ) : (
                <Text variant="body" color="secondary" style={{ textAlign: 'center', paddingVertical: space.lg }}>
                  No comments yet. Start the trash talk.
                </Text>
              )}
            </ScrollView>

            <View style={{ paddingHorizontal: screenX, paddingTop: space.xs, gap: space.xs }}>
              {replyTo ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Text variant="footnote" color="secondary" style={{ flex: 1 }}>
                    Replying to {replyTo.display_name}
                  </Text>
                  <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                    <Text variant="footnote" color="ember">
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              <Input
                value={body}
                onChangeText={setBody}
                placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
                maxLength={500}
                multiline
              />
              <Button
                label="Post"
                size="md"
                fullWidth
                loading={post.isPending}
                disabled={!body.trim()}
                onPress={send}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
