import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';
import { palette, stageColor } from '../constants/theme';
import { categoryFor } from '../domain/categories';
import type { DigestGroup, StagedBatch } from '../domain/types';
import { DateStamp } from './DateStamp';
import { SampleBadge } from './SampleBadge';
import { StagePill } from './StagePill';

/**
 * One product that needs attention. The category panel runs the full height of
 * the card so the product reads as a picture first and a name second — the way
 * you'd spot it on a shelf while holding the phone in one hand.
 */
export function AttentionCard({
  group,
  onDiscard,
  onEdit,
}: {
  group: DigestGroup;
  onDiscard: (batch: StagedBatch) => void;
  onEdit: (batch: StagedBatch) => void;
}) {
  const category = categoryFor(group.product.category);
  const soonest = group.batches[0];
  const others = group.batches.length - 1;

  return (
    <View
      className="mb-3 flex-row overflow-hidden rounded-xl border border-line bg-card"
      style={{
        shadowColor: palette.ink,
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      <View
        className="items-center justify-center px-4"
        style={{ width: 104, backgroundColor: `${category.color}1F` }}
      >
        <MaterialCommunityIcons name={category.icon as never} size={46} color={category.color} />
        <Text
          className="mt-2 text-center font-medium text-[10px] uppercase"
          style={{ color: category.color, letterSpacing: 0.8 }}
          numberOfLines={1}
        >
          {category.label}
        </Text>
      </View>

      <View style={{ width: 3, backgroundColor: stageColor[group.stage] }} />

      <View className="flex-1 p-3.5">
        <View className="flex-row items-start gap-2">
          <Text className="flex-1 font-display text-base text-ink" numberOfLines={2}>
            {group.product.name}
          </Text>
          {group.product.isSample && <SampleBadge />}
        </View>

        <View className="mt-2 flex-row items-center gap-2">
          <DateStamp date={soonest.expiresAt} stage={soonest.stage} size="sm" />
          <StagePill stage={group.stage} daysLeft={group.daysLeft} />
        </View>

        <Text className="mt-2 font-body text-xs text-muted">
          {group.totalQuantity} {group.product.unit ?? 'pcs'}
          {soonest.location ? ` · ${soonest.location}` : ''}
          {others > 0 ? ` · +${others} more ${others === 1 ? 'batch' : 'batches'}` : ''}
        </Text>

        <View className="mt-3 flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Discard the ${group.product.name} batch expiring ${soonest.expiresAt}`}
            onPress={() => onDiscard(soonest)}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5"
            style={{ backgroundColor: palette.ink }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={15} color={palette.card} />
            <Text className="font-semibold text-xs text-card">Discard</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit the ${group.product.name} batch expiring ${soonest.expiresAt}`}
            onPress={() => onEdit(soonest)}
            className="flex-row items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2.5"
          >
            <MaterialCommunityIcons name="pencil-outline" size={15} color={palette.ink} />
            <Text className="font-medium text-xs text-ink">Edit</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
