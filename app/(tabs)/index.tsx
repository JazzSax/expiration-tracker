import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AttentionCard } from '../../components/AttentionCard';
import { ExpiredRow } from '../../components/ExpiredRow';
import { StatHeader } from '../../components/StatHeader';
import { StockBreakdown } from '../../components/StockBreakdown';
import { palette, stageColor } from '../../constants/theme';
import { todayIso } from '../../domain/expiry';
import { soonestUpcoming } from '../../domain/summary';
import type { StagedBatch } from '../../domain/types';
import { useDashboard, useDiscardBatch } from '../../hooks/useStock';
import { formatFullDate } from '../../lib/format';

/** How many products the attention list shows before deferring to Stock. */
const ATTENTION_LIMIT = 3;

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-center justify-between">
        <Text
          className="font-medium text-[11px] uppercase text-muted"
          style={{ letterSpacing: 1.1 }}
        >
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function SeeAll({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      className="flex-row items-center gap-1"
    >
      <Text className="font-semibold text-xs text-ink">{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={16} color={palette.ink} />
    </Pressable>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useDashboard();
  const discard = useDiscardBatch();

  const digest = data?.digest;
  const groups = digest?.groups ?? [];
  const attention = groups.filter((group) => group.stage !== 'expired');
  const expired = groups.filter((group) => group.stage === 'expired');
  const shown = attention.slice(0, ATTENTION_LIMIT);

  function confirmDiscard(batch: StagedBatch) {
    Alert.alert(
      `Discard ${batch.product.name}?`,
      `${batch.quantity} ${batch.product.unit ?? 'pcs'} expiring ${batch.expiresAt} will be moved to your waste log.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () =>
            discard.mutate(
              { id: batch.id, quantity: batch.quantity },
              { onError: (error) => Alert.alert("Couldn't discard that batch", String(error)) },
            ),
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerClassName="px-4 pb-10"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.ink} />
        }
      >
        <View className="mb-4 flex-row items-end justify-between pt-3">
          <Text className="font-display text-2xl text-ink">Today</Text>
          <Text className="font-stamp text-xs text-muted" style={{ letterSpacing: 1 }}>
            {formatFullDate(todayIso()).toUpperCase()}
          </Text>
        </View>

        {digest && <StatHeader counts={digest.counts} soonest={soonestUpcoming(digest)} />}

        <Section
          title="Needs attention"
          action={
            attention.length > ATTENTION_LIMIT ? (
              <SeeAll
                label={`See all ${attention.length}`}
                onPress={() => router.push('/inventory')}
              />
            ) : undefined
          }
        >
          {shown.length > 0 ? (
            shown.map((group) => (
              <AttentionCard
                key={group.product.id}
                group={group}
                onDiscard={confirmDiscard}
                onEdit={(batch) => router.push(`/batch/${batch.id}`)}
              />
            ))
          ) : isLoading ? null : (
            <View className="items-center rounded-xl border border-dashed border-line px-4 py-8">
              <MaterialCommunityIcons
                name={digest?.counts.total ? 'check-circle-outline' : 'truck-delivery-outline'}
                size={34}
                color={digest?.counts.total ? stageColor.ok : palette.muted}
              />
              <Text className="mt-3 text-center font-display text-base text-ink">
                {digest?.counts.total ? 'Nothing needs attention' : 'No stock on file yet'}
              </Text>
              <Text className="mt-1 text-center font-body text-sm text-muted">
                {digest?.counts.total
                  ? "Every batch is inside its shelf life. You'll get an alert before that changes."
                  : 'Open Receive when a delivery arrives to record its expiry dates.'}
              </Text>
            </View>
          )}
        </Section>

        {expired.length > 0 && (
          <Section title={`Expired · ${expired.length}`}>
            <ExpiredRow groups={expired} onDiscard={confirmDiscard} />
          </Section>
        )}

        {data && data.categories.length > 0 && (
          <Section
            title="All stock"
            action={<SeeAll label="Open list" onPress={() => router.push('/inventory')} />}
          >
            <StockBreakdown summary={data.categories} />
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
