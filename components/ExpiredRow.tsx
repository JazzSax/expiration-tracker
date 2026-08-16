import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { palette, stageColor } from '../constants/theme';
import { categoryFor } from '../domain/categories';
import type { DigestGroup, StagedBatch } from '../domain/types';
import { formatCountdown, formatStamp } from '../lib/format';

/**
 * Expired stock, side by side. A horizontal row keeps it present without
 * letting it push the things you can still sell off the screen.
 */
export function ExpiredRow({
  groups,
  onDiscard,
}: {
  groups: DigestGroup[];
  onDiscard: (batch: StagedBatch) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 pr-4"
    >
      {groups.map((group) => {
        const category = categoryFor(group.product.category);
        const worst = group.batches[0];

        return (
          <View
            key={group.product.id}
            className="overflow-hidden rounded-xl border bg-card"
            style={{ width: 168, borderColor: `${stageColor.expired}55` }}
          >
            <View
              className="items-center py-5"
              style={{ backgroundColor: `${category.color}1F` }}
            >
              <MaterialCommunityIcons name={category.icon as never} size={40} color={category.color} />
            </View>

            <View className="p-3">
              <Text className="font-display text-sm text-ink" numberOfLines={2}>
                {group.product.name}
              </Text>

              <View className="mt-1.5 flex-row items-center gap-1.5">
                <Text
                  className="font-stampBold text-[11px]"
                  style={{ color: stageColor.expired, letterSpacing: 1 }}
                >
                  {formatStamp(worst.expiresAt)}
                </Text>
              </View>
              <Text className="mt-0.5 font-body text-[11px]" style={{ color: stageColor.expired }}>
                {formatCountdown(group.daysLeft)}
              </Text>

              <Text className="mt-1 font-body text-[11px] text-muted">
                {group.totalQuantity} {group.product.unit ?? 'pcs'}
                {worst.location ? ` · ${worst.location}` : ''}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Discard the expired ${group.product.name}`}
                onPress={() => onDiscard(worst)}
                className="mt-2.5 flex-row items-center justify-center gap-1.5 rounded-lg py-2"
                style={{ backgroundColor: stageColor.expired }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={14} color={palette.card} />
                <Text className="font-semibold text-[11px] text-card">Discard</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
