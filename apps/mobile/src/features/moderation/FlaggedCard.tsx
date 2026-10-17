/**
 * The accused's side of moderation (F11.3).
 *
 * When three people report your check-in it is hidden pending review, and you
 * get a 24h window to say what actually happened. This is that window: shown
 * on the pool it belongs to, never buried in a settings screen, because the
 * clock is running and silence is read as a guilty plea.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toast } from '../../stores/toastStore';
import {
  Button,
  GlassCard,
  haptic,
  Input,
  space,
  Text,
  useTheme,
} from '../../ui';
import {
  deadlineLabel,
  DISPUTE_MIN_LENGTH,
  useMyFlagged,
  useSubmitDispute,
  type FlaggedCheckIn,
} from './useModeration';

/** "16 Oct" — a raw checkin_date is a database value, not something to read. */
function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function StatusLine({ item }: { item: FlaggedCheckIn }) {
  const due = deadlineLabel(item.dispute_deadline);

  if (item.dispute_status === 'accepted') {
    return (
      <Text variant="footnote" color="mint">
        Reviewed and cleared. Nothing was taken off you.
      </Text>
    );
  }
  if (item.dispute_status === 'rejected') {
    return (
      <Text variant="footnote" color="blood">
        A moderator upheld the reports. It counts as a miss.
      </Text>
    );
  }
  if (item.dispute_status === 'open') {
    return (
      <Text variant="footnote" color="secondary">
        Your explanation is with a moderator. You will be told either way.
      </Text>
    );
  }
  return (
    <Text variant="footnote" color={due.overdue ? 'muted' : 'secondary'}>
      {due.overdue
        ? 'The window to explain has closed. A moderator will decide on the reports alone.'
        : `${due.text} to explain yourself.`}
    </Text>
  );
}

function FlaggedItem({ item }: { item: FlaggedCheckIn }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const submit = useSubmitDispute();

  const short = body.trim().length < DISPUTE_MIN_LENGTH;

  const send = async () => {
    try {
      await submit.mutateAsync({ checkInId: item.check_in_id, body: body.trim() });
      haptic.success();
      setOpen(false);
      setBody('');
      toast.success('Sent', 'A moderator will look at it.');
    } catch (e) {
      haptic.error();
      const msg = e instanceof Error ? e.message : 'failed';
      toast.error(
        msg === 'too_short'
          ? 'Say a bit more'
          : msg === 'already_disputed'
            ? 'You have already explained this one'
            : msg === 'window_closed'
              ? 'That window has closed'
              : 'Could not send that',
      );
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      <View>
        <Text variant="bodyMedium">Your {dayLabel(item.checkin_date)} check-in is under review</Text>
        <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
          {item.reported_count} {item.reported_count === 1 ? 'person' : 'people'} reported it, so it
          is hidden until a moderator looks. Your streak is untouched for now.
        </Text>
      </View>

      <StatusLine item={item} />

      {item.can_dispute &&
        (open ? (
          <View
            style={{
              gap: space.sm,
              paddingTop: space.xs,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.glassBorder,
            }}
          >
            <Input
              value={body}
              onChangeText={setBody}
              placeholder="What was actually happening in that photo?"
              multiline
              numberOfLines={4}
              maxLength={1000}
              accessibilityLabel="Your explanation"
            />
            <Text variant="caption" color="muted">
              {short
                ? `${DISPUTE_MIN_LENGTH - body.trim().length} more characters — one word is not a defence`
                : `${body.trim().length}/1000`}
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => {
                    haptic.tap();
                    setOpen(false);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Send"
                  disabled={short || submit.isPending}
                  loading={submit.isPending}
                  onPress={send}
                />
              </View>
            </View>
          </View>
        ) : (
          <Button
            label="Explain what happened"
            variant="secondary"
            onPress={() => {
              haptic.tap();
              setOpen(true);
            }}
          />
        ))}
    </View>
  );
}

/** Renders nothing unless one of *your* check-ins in this pool is flagged. */
export function FlaggedCard({ poolId }: { poolId: string | undefined }) {
  const theme = useTheme();
  const flagged = useMyFlagged();
  const mine = (flagged.data ?? []).filter((f) => !poolId || f.pool_id === poolId);

  if (mine.length === 0) return null;

  return (
    <GlassCard tone="shame">
      <View style={{ gap: space.md }}>
        {mine.map((item, i) => (
          <View
            key={item.check_in_id}
            style={
              i === 0
                ? undefined
                : {
                    paddingTop: space.md,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.glassBorder,
                  }
            }
          >
            <FlaggedItem item={item} />
          </View>
        ))}
      </View>
    </GlassCard>
  );
}
