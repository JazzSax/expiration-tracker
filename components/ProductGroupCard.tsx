import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';
import { palette, stageColor } from '../constants/theme';
import { categoryFor } from '../domain/categories';
import type { DigestGroup, StagedBatch } from '../domain/types';
import { CategoryIcon } from './CategoryIcon';
import { DateStamp } from './DateStamp';
import { SampleBadge } from './SampleBadge';
import { StagePill } from './StagePill';

/**
 * One product, with every batch of it pooled underneath. The left rule carries
 * the group's worst stage so a shelf's worth of cards scans at a glance.
 */
export function ProductGroupCard({
  group,
  onDiscard,
  onEdit,
}: {
  group: DigestGroup;
  onDiscard: (batch: StagedBatch) => void;
  onEdit: (batch: StagedBatch) => void;
}) {
  const category = categoryFor(group.product.category);

  return (
    <View
      className="mb-3 flex-row overflow-hidden rounded-xl border border-line bg-card"
      style={{
        shadowColor: palette.ink,
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <View style={{ width: 4, backgroundColor: stageColor[group.stage] }} />

      <View className="flex-1 p-3.5">
        <View className="flex-row items-start gap-3">
          <CategoryIcon category={group.product.category} />

          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="flex-1 font-display text-base text-ink" numberOfLines={2}>
                {group.product.name}
              </Text>
              {group.product.isSample && <SampleBadge />}
            </View>
            <Text className="mt-0.5 font-body text-xs text-muted">
              {category.label} · {group.totalQuantity} {group.product.unit ?? 'pcs'} in{' '}
              {group.batches.length} {group.batches.length === 1 ? 'batch' : 'batches'}
            </Text>
          </View>

          <StagePill stage={group.stage} daysLeft={group.daysLeft} />
        </View>

        <View className="mt-3 gap-2">
          {group.batches.map((batch) => (
            <View
              key={batch.id}
              className="flex-row items-center justify-between gap-2 border-t border-line pt-2"
            >
              <View className="flex-1 flex-row items-center gap-2">
                <DateStamp date={batch.expiresAt} stage={batch.stage} size="sm" />
                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons name="package-variant" size={12} color={palette.muted} />
                  <Text className="font-body text-xs text-muted">{batch.quantity}</Text>
                </View>
                {batch.location ? (
                  <View className="flex-row items-center gap-1">
                    <MaterialCommunityIcons name="map-marker-outline" size={12} color={palette.muted} />
                    <Text className="font-body text-xs text-muted" numberOfLines={1}>
                      {batch.location}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row items-center gap-1.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit the ${batch.product.name} batch expiring ${batch.expiresAt}`}
                  onPress={() => onEdit(batch)}
                  hitSlop={6}
                  className="rounded-md border border-line px-2 py-1.5"
                >
                  <MaterialCommunityIcons name="pencil-outline" size={14} color={palette.ink} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Discard the ${batch.product.name} batch expiring ${batch.expiresAt}`}
                  onPress={() => onDiscard(batch)}
                  hitSlop={6}
                  className="flex-row items-center gap-1 rounded-md px-2.5 py-1.5"
                  style={{ backgroundColor: palette.ink }}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={14} color={palette.card} />
                  <Text className="font-medium text-xs text-card">Discard</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
