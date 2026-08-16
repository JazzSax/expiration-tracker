import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductGroupCard } from '../../components/ProductGroupCard';
import { palette } from '../../constants/theme';
import { addDays, todayIso } from '../../domain/expiry';
import type { StagedBatch } from '../../domain/types';
import { useBatches, useDiscardBatch } from '../../hooks/useStock';

type Range = { key: string; label: string; from?: string; to?: string };

const RANGES: Range[] = [
  { key: 'all', label: 'All dates' },
  { key: 'week', label: 'Next 7 days', to: addDays(todayIso(), 7) },
  { key: 'month', label: 'Next 30 days', to: addDays(todayIso(), 30) },
  { key: 'past', label: 'Already expired', to: addDays(todayIso(), -1) },
];

export default function StockScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<Range>(RANGES[0]);
  const discard = useDiscardBatch();

  const { data: digest, refetch, isRefetching } = useBatches({
    search,
    from: range.from,
    to: range.to,
  });

  // Stock shows everything in range, including batches that are perfectly fine —
  // buildDigest only groups what needs attention, so regroup here.
  const groups = digest ? [...digest.groups] : [];

  function confirmDiscard(batch: StagedBatch) {
    Alert.alert(`Discard ${batch.product.name}?`, `Expiring ${batch.expiresAt}.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => discard.mutate({ id: batch.id, quantity: batch.quantity }),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <FlatList
        data={groups}
        keyExtractor={(group) => String(group.product.id)}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.ink} />
        }
        ListHeaderComponent={
          <View className="pb-4 pt-3">
            <Text className="mb-3 font-display text-2xl text-ink">Stock</Text>

            <View className="flex-row items-center gap-2 rounded-lg border border-line bg-card px-3">
              <MaterialCommunityIcons name="magnify" size={18} color={palette.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search products"
                placeholderTextColor={palette.muted}
                className="flex-1 py-3 font-body text-base text-ink"
              />
              {search.length > 0 && (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={palette.muted} />
                </Pressable>
              )}
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
              {RANGES.map((option) => {
                const selected = option.key === range.key;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setRange(option)}
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: selected ? palette.ink : palette.line,
                      backgroundColor: selected ? palette.ink : palette.card,
                    }}
                  >
                    <Text
                      className="font-medium text-xs"
                      style={{ color: selected ? palette.card : palette.ink }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {digest && (
              <Text className="mt-4 font-body text-xs text-muted">
                {digest.counts.total} {digest.counts.total === 1 ? 'batch' : 'batches'} in view ·{' '}
                {digest.counts.expired} expired
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ProductGroupCard
            group={item}
            onDiscard={confirmDiscard}
            onEdit={(batch) => router.push(`/batch/${batch.id}`)}
          />
        )}
        ListEmptyComponent={
          <View className="mt-6 items-center rounded-xl border border-dashed border-line px-4 py-8">
            <MaterialCommunityIcons name="package-variant" size={34} color={palette.muted} />
            <Text className="mt-3 text-center font-display text-base text-ink">Nothing in this view</Text>
            <Text className="mt-1 text-center font-body text-sm text-muted">
              {search || range.key !== 'all'
                ? 'Try a wider date range or a different search.'
                : 'Record a delivery in Receive to start tracking it.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
